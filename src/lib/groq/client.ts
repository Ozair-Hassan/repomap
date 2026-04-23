import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(messages: Message[]): Promise<string> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages,
  })

  const content = response.choices[0]?.message?.content

  if (!content) {
    throw new Error('Groq returned an empty response')
  }

  return content
}
