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

// Function to fetch quotes from Quotable API
async function getQuotableQuote(topic?: string) {
  try {
    const searchParam = topic ? `?tags=${encodeURIComponent(topic)}` : '/random'
    const response = await fetch(`https://api.quotable.io/quotes/random${searchParam}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch quote from API')
    }
    
    const data = await response.json()
    return data[0]?.content || null
  } catch (error) {
    console.error('Quotable API error:', error)
    return null
  }
}

export async function generateQuote(prompt: string) {
  try {
    // Add input validation
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Please enter a topic for your quote')
    }

    // 30% chance to fetch a real quote from Quotable API
    if (Math.random() < 0.3) {
      const realQuote = await getQuotableQuote(prompt)
      if (realQuote) return realQuote
    }

    const basePrompt = "Generate a short, inspiring quote. You can add an action or reflection to the quote if you want."
    const fullPrompt = prompt 
      ? `${basePrompt} about ${prompt}. Make it unique, original, and different from previous quotes.` 
      : `${basePrompt}. Make it unique and different from previous quotes, universally relevant and memoriable`

    const shouldUseRealQuote = Math.random() < 0.3 //30% of using real quotes
    const randomFactor = Math.random().toString(36).substring(7)

    const { text } = await generateText({
      model: openai('gpt-3.5-turbo'),
      prompt: shouldUseRealQuote 
        ? "Return a famous inspirational quote from history, including its author." 
        : `${fullPrompt} (Random factor: ${randomFactor})`,
    })

    return text.replace(/["']/g, '') // Remove any quotation marks from the response
  } catch (error) {
    console.error('Quote generation error:', error)
    throw new Error('Failed to generate quote')
  }
}

export async function generateIcon(quote: string): Promise<keyof typeof AVAILABLE_ICONS> {
  const { text } = await generateText({
    model: openai('gpt-3.5-turbo'),
    prompt: `Given this quote: "${quote}", choose ONE word from this list that best represents it: Quote, Lightbulb, Heart, Star, Sun, Moon, Coffee, Music, Book, Smile. Only respond with the word, nothing else.`,
  })

  const iconName = text.trim() as keyof typeof AVAILABLE_ICONS
  return AVAILABLE_ICONS[iconName] ? iconName : 'Quote'
}

