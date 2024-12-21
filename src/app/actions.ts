'use server'

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { Quote, Lightbulb, Heart, Star, Sun, Moon, Coffee, Music, Book, Smile } from 'lucide-react'

const AVAILABLE_ICONS = {
  Quote,
  Lightbulb,
  Heart,
  Star,
  Sun,
  Moon,
  Coffee,
  Music,
  Book,
  Smile
} as const

export async function generateQuote(prompt: string): Promise<string> {
  const basePrompt = "Generate a short, inspiring quote"
  const fullPrompt = prompt 
    ? `${basePrompt} about ${prompt}. Make it unique and different from previous quotes.` 
    : `${basePrompt}. Make it unique and different from previous quotes.`

  const randomFactor = Math.random().toString(36).substring(7)

  const { text } = await generateText({
    model: openai('gpt-3.5-turbo'),
    prompt: `${fullPrompt} (Random factor: ${randomFactor})`,
  })

  return text
}

export async function generateIcon(quote: string): Promise<keyof typeof AVAILABLE_ICONS> {
  const { text } = await generateText({
    model: openai('gpt-3.5-turbo'),
    prompt: `Given this quote: "${quote}", choose ONE word from this list that best represents it: Quote, Lightbulb, Heart, Star, Sun, Moon, Coffee, Music, Book, Smile. Only respond with the word, nothing else.`,
  })

  const iconName = text.trim() as keyof typeof AVAILABLE_ICONS
  return AVAILABLE_ICONS[iconName] ? iconName : 'Quote'
}

