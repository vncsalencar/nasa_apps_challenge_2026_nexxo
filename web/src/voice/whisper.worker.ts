// The Web Worker that writes speech as text with a small English Whisper model.
// It runs in the browser. No audio leaves the device.
//
// Messages to the worker:
//   { type: 'load', model?, device?, dtype? }   load the model (the listener sends this one time)
//   { type: 'transcribe', id, audio, hint }      audio is a Float32Array, one channel, 16000 samples for each second.
//                                                hint is the trigger word. It tells the model how to write this word.
// Messages from the worker:
//   { type: 'progress', value }                  0 to 1, the download of the model files
//   { type: 'ready', device, model, bytes }      device is 'webgpu' or 'wasm', bytes is the size of the model files
//   { type: 'result', id, text, ms }             ms is the time that the model needed
//   { type: 'error', id?, message }
import { env, pipeline } from '@huggingface/transformers'

export type Device = 'webgpu' | 'wasm'

export type WorkerRequest =
  | { type: 'load'; model?: string; device?: Device; dtype?: string }
  | { type: 'transcribe'; id: number; audio: Float32Array; hint: string }

export type WorkerReply =
  | { type: 'progress'; value: number }
  | { type: 'ready'; device: Device; model: string; bytes: number }
  | { type: 'result'; id: number; text: string; ms: number }
  | { type: 'error'; id?: number; message: string }

// The model and the number format of the weights for each device. The choice comes from measurements
// in Chromium on a fast desktop processor, with sentences of 2 to 3 seconds:
// - WebAssembly has one thread here, because the page is not cross-origin isolated. The base model needs
//   1.7 seconds for a sentence, the tiny model 0.85 seconds. So WebAssembly gets the tiny model.
//   8-bit weights are the fastest format there (32-bit weights: 1.0 seconds).
// - WebGPU runs the encoder (the slow part) on the graphics card, so it can use the base model, which makes
//   fewer errors. WebGPU cannot run 8-bit weights on the graphics card, so the encoder has 32-bit weights.
//   The decoder needs some milliseconds for each word. It stays on WebAssembly with 8-bit weights,
//   and this keeps the download small.
// With the hint (see prefixFor), the two models write the trigger word correctly in 34 of 36 test sentences.
type Plan = {
  model: string
  device: Device | Record<string, Device>
  dtype: string | Record<string, string>
}
const PLANS: Record<Device, Plan> = {
  webgpu: {
    model: 'onnx-community/whisper-base.en',
    device: { encoder_model: 'webgpu', decoder_model_merged: 'wasm' },
    dtype: { encoder_model: 'fp32', decoder_model_merged: 'q8' },
  },
  wasm: { model: 'onnx-community/whisper-tiny.en', device: 'wasm', dtype: 'q8' },
}

// The parts of the transformers.js pipeline that the worker uses.
type Tensor = { tolist: () => bigint[][] }
type Whisper = {
  processor: (audio: Float32Array) => Promise<{ input_features: unknown }>
  tokenizer: {
    encode: (text: string, options: { add_special_tokens: boolean }) => number[]
    decode: (ids: bigint[], options: { skip_special_tokens: boolean }) => string
    convert_tokens_to_ids: (token: string) => number | undefined
  }
  model: {
    generate: (options: Record<string, unknown>) => Promise<Tensor>
    generation_config: { decoder_start_token_id: number; no_timestamps_token_id: number }
  }
}

const scope = self as unknown as {
  postMessage: (message: WorkerReply) => void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

// The model files come from the Hugging Face hub at the first use. The browser caches them.
env.allowLocalModels = false
// The app serves the WebAssembly runtime itself (see scripts/copy-voice-assets.mjs).
const ortBase = new URL(`${import.meta.env.BASE_URL}voice/ort/`, self.location.origin).href
const wasm = env.backends.onnx.wasm
if (wasm) {
  wasm.wasmPaths = {
    mjs: `${ortBase}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${ortBase}ort-wasm-simd-threaded.asyncify.wasm`,
  }
  // The page is not cross-origin isolated, so WebAssembly has one thread.
  wasm.numThreads = 1
}

let whisper: Whisper | null = null
// The last progress value that the worker sent.
let last = 0

// The first tokens that the decoder gets. Without a hint: "start of the text, no time stamps".
// With a hint, the hint comes first as "text before this audio". The model then writes the word in the
// same way when it hears it. Without the hint the model writes "Next," for "Nexxo,".
const prefixes = new Map<string, number[]>()
function prefixFor(parts: Whisper, hint: string): number[] {
  const known = prefixes.get(hint)
  if (known) return known
  const config = parts.model.generation_config
  const start = [config.decoder_start_token_id, config.no_timestamps_token_id]
  const before = parts.tokenizer.convert_tokens_to_ids('<|startofprev|>')
  const word = hint.trim()
  const prefix =
    word && before != null
      ? [before, ...parts.tokenizer.encode(` ${word}.`, { add_special_tokens: false }), ...start]
      : start
  prefixes.set(hint, prefix)
  return prefix
}

async function write(parts: Whisper, audio: Float32Array, hint: string, limit: number): Promise<string> {
  const prefix = prefixFor(parts, hint)
  const { input_features } = await parts.processor(audio)
  const output = await parts.model.generate({
    inputs: input_features,
    decoder_input_ids: prefix,
    // A command is short. The limit stops the model if it repeats words without end.
    max_new_tokens: limit,
  })
  // The output starts with the prefix. The text comes after it.
  const tokens = output.tolist()[0].slice(prefix.length)
  return parts.tokenizer.decode(tokens, { skip_special_tokens: true }).trim()
}

// True if the browser has a real graphics card for WebGPU.
// A software adapter (the processor does the work of the graphics card) is slower than WebAssembly.
async function hasWebGpu(): Promise<boolean> {
  type Adapter = { isFallbackAdapter?: boolean; info?: { isFallbackAdapter?: boolean } }
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<Adapter | null> } }).gpu
    if (!gpu) return false
    const adapter = await gpu.requestAdapter()
    if (!adapter) return false
    return !(adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter)
  } catch {
    return false
  }
}

// If one sentence needs more time than this on WebGPU, the worker changes to WebAssembly.
const SLOW_MS = 1500

// For tests: "q8" is one format for the two parts, "fp32,q8" is the encoder format and the decoder format.
function formats(text: string | undefined): string | Record<string, string> | undefined {
  if (!text?.includes(',')) return text
  const [encoder, decoder] = text.split(',')
  return { encoder_model: encoder, decoder_model_merged: decoder }
}

async function build(
  device: Device,
  request: Extract<WorkerRequest, { type: 'load' }>,
): Promise<{ parts: Whisper; model: string; bytes: number; ms: number }> {
  const plan = PLANS[device]
  const model = request.model ?? plan.model
  let bytes = 0
  const make = pipeline as unknown as (
    task: string,
    model: string,
    options: Record<string, unknown>,
  ) => Promise<Whisper>
  const parts = await make('automatic-speech-recognition', model, {
    device: plan.device,
    dtype: formats(request.dtype) ?? plan.dtype,
    progress_callback: (info: { status: string; progress?: number; total?: number }) => {
      if (info.status !== 'progress_total') return
      bytes = Math.max(bytes, info.total ?? 0)
      const value = Math.min(1, (info.progress ?? 0) / 100)
      // Send a message for each full percent only.
      if (value - last >= 0.01 || (value === 1 && last < 1)) {
        last = value
        scope.postMessage({ type: 'progress', value })
      }
    },
  })
  // The first run is slow, because the runtime prepares the model. Do it now with one second of silence,
  // so the first real sentence is fast. This run also proves that the device works.
  await write(parts, new Float32Array(16000), '', 4)
  // On WebGPU, measure a second run. The time does not depend on the length of the audio.
  let ms = 0
  if (device === 'webgpu') {
    const started = performance.now()
    await write(parts, new Float32Array(16000), '', 4)
    ms = performance.now() - started
  }
  return { parts, model, bytes, ms }
}

async function load(request: Extract<WorkerRequest, { type: 'load' }>) {
  const order: Device[] = request.device
    ? [request.device]
    : (await hasWebGpu())
      ? ['webgpu', 'wasm']
      : ['wasm']
  let failure: unknown = null
  for (const device of order) {
    try {
      const { parts, model, bytes, ms } = await build(device, request)
      // A weak graphics card can be slower than WebAssembly with the small model.
      if (device === 'webgpu' && order.length > 1 && ms > SLOW_MS) {
        throw new Error(`WebGPU is slow here (${Math.round(ms)} ms for one sentence).`)
      }
      whisper = parts
      scope.postMessage({ type: 'ready', device, model, bytes })
      return
    } catch (error) {
      // If the graphics card cannot run the model, try WebAssembly next.
      failure = error
      last = 0
    }
  }
  scope.postMessage({ type: 'error', message: String(failure) })
}

async function transcribe(id: number, audio: Float32Array, hint: string) {
  if (!whisper) {
    scope.postMessage({ type: 'error', id, message: 'The model is not loaded.' })
    return
  }
  try {
    const started = performance.now()
    const text = await write(whisper, audio, hint, 64)
    scope.postMessage({ type: 'result', id, text, ms: Math.round(performance.now() - started) })
  } catch (error) {
    scope.postMessage({ type: 'error', id, message: String(error) })
  }
}

// The worker does one task at a time, in the order of the messages.
let chain: Promise<void> = Promise.resolve()
scope.onmessage = (event) => {
  const request = event.data
  chain = chain.then(() =>
    request.type === 'load' ? load(request) : transcribe(request.id, request.audio, request.hint),
  )
}
