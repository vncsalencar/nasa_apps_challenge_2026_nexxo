// Provider for Claude through the Anthropic API.
// The client reads the credentials from the environment (ANTHROPIC_API_KEY).
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { tx } from '../i18n.ts'
import { InsightSchema, Problem, type Provider } from './schema.ts'

let client: Anthropic | null = null

export const anthropicProvider: Provider = async ({ model, system, context }) => {
  client ??= new Anthropic()
  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // If the model declines the request, the API runs it again on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: context }],
      output_config: { effort: 'medium', format: betaZodOutputFormat(InsightSchema) },
    })
    if (response.stop_reason === 'refusal') throw new Problem(tx('The model declined to answer.'))
    if (response.stop_reason === 'max_tokens') throw new Problem(tx('The answer of the model was too long.'))
    if (!response.parsed_output) throw new Problem(tx('The model did not return an insight in the right shape.'))
    return { insight: response.parsed_output, model: response.model }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Problem(tx('The Anthropic API refused the key. Set ANTHROPIC_API_KEY on the server.'))
    }
    if (error instanceof Anthropic.RateLimitError) throw new Problem(tx('The Anthropic API limits the rate. Try again later.'))
    if (error instanceof Anthropic.APIConnectionError) throw new Problem(tx('The server cannot reach the Anthropic API.'))
    // The message of the API is English. Cut it here, because nobody can cut the token later.
    if (error instanceof Anthropic.APIError) {
      throw new Problem(tx('The Anthropic API answered {status}: {message}', { status: String(error.status), message: error.message.slice(0, 300) }))
    }
    // A Problem from the lines above passes here. The client also throws a plain error when it finds no credentials.
    throw error
  }
}
