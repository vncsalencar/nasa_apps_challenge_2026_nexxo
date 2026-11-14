// Copies the files that the voice listener loads at run time into web/public/voice/.
// The app serves these files itself, so the listener does not need a CDN for them.
// "npm run dev" and "npm run build" run this script first. Git ignores the copies.
//
//   public/voice/vad/  the speech detector: its worklet, its model, and its WebAssembly runtime
//   public/voice/ort/  the WebAssembly runtime of the Whisper model
//
// The two packages use two different versions of onnxruntime-web. Each version gets its own
// folder, because the file names are the same in the two versions.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const target = join(here, '..', 'public', 'voice')
const require = createRequire(import.meta.url)

// The folder "dist" of a package, found through its main file.
function distOf(name, from = require) {
  return dirname(from.resolve(name))
}

const vadDist = distOf('@ricky0123/vad-web')
// Each package can have its own copy of onnxruntime-web. Resolve it from the package that uses it.
const vadOrtDist = distOf('onnxruntime-web', createRequire(join(vadDist, 'index.js')))
const whisperOrtDist = distOf(
  'onnxruntime-web',
  createRequire(require.resolve('@huggingface/transformers')),
)

const files = [
  [vadDist, 'vad.worklet.bundle.min.js', 'vad'],
  [vadDist, 'silero_vad_v5.onnx', 'vad'],
  [vadOrtDist, 'ort-wasm-simd-threaded.mjs', 'vad'],
  [vadOrtDist, 'ort-wasm-simd-threaded.wasm', 'vad'],
  [whisperOrtDist, 'ort-wasm-simd-threaded.asyncify.mjs', 'ort'],
  [whisperOrtDist, 'ort-wasm-simd-threaded.asyncify.wasm', 'ort'],
]

let copied = 0
for (const [from, name, folder] of files) {
  const source = join(from, name)
  const copy = join(target, folder, name)
  // Skip a file that is already there with the same size and a newer date.
  if (existsSync(copy)) {
    const a = statSync(source)
    const b = statSync(copy)
    if (a.size === b.size && b.mtimeMs >= a.mtimeMs) continue
  }
  mkdirSync(dirname(copy), { recursive: true })
  copyFileSync(source, copy)
  copied += 1
}
console.log(`voice assets: ${copied} of ${files.length} files copied to public/voice`)
