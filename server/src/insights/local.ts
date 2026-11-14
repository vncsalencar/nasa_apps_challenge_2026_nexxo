// Provider for a model that runs near the crew, with no link to Earth.
// It talks to any server with the "chat completions" API that Ollama, llama.cpp,
// LM Studio and vLLM offer. The Claude provider does not use this file.
import { z } from 'zod'
import { tx } from '../i18n.ts'
import { InsightSchema, Problem, type Provider } from './schema.ts'

const TIMEOUT_MS = 120_000

export const localProvider: Provider = async ({ model, baseUrl, system, context }) => {
  const shape = JSON.stringify(z.toJSONSchema(InsightSchema))
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.LOCAL_LLM_API_KEY ? { authorization: `Bearer ${process.env.LOCAL_LLM_API_KEY}` } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${system}\n\nAnswer with one JSON object that follows this JSON schema:\n${shape}` },
          { role: 'user', content: context },
        ],
      }),
    })
  } catch {
    throw new Problem(tx('The server cannot reach the local model at {baseUrl}.', { baseUrl }))
  }
  // Cut the answer of the model here, because nobody can cut the token later.
  if (!response.ok) throw new Problem(tx('The local model answered {status}: {text}', { status: response.status, text: (await response.text()).slice(0, 200) }))

  const data = (await response.json()) as { model?: string; choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Problem(tx('The local model did not return JSON.'))
  }
  // A small model can return a wrong shape. Check it before the app uses it.
  const parsed = InsightSchema.safeParse(json)
  if (!parsed.success) throw new Problem(tx('The local model did not return an insight in the right shape.'))
  return { insight: parsed.data, model: data.model ?? model }
}
