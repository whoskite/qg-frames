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

const QUOTE_STYLES = [
  'motivational',
  'philosophical',
  'practical wisdom',
  'thought-provoking',
  'emotional',
  'humorous wisdom',
  'paradoxical',
  'metaphorical',
  'contrarian',
  'storytelling'
] as const

const QUOTE_STRUCTURES = [
  'Direct Insight: "[Clear statement] because [unexpected reason]"',
  'Question Format: "Why [common belief] when [alternative perspective]?"',
  'Contrast: "We chase [common desire], but [deeper truth] matters more"',
  'Metaphor: "[Complex idea] is like [simple comparison]"',
  'Challenge: "Stop [common behavior] and start [better alternative]"',
  'Paradox: "[Apparent contradiction] leads to [deeper truth]"',
  'Personal: "Your [attribute/action] is not [common assumption], it\'s [reframe]"',
  'Action-Result: "Every time you [action], you [unexpected outcome]"',
  'Wisdom Pattern: "The [noun] that [action] is not the [noun] that [different action]"',
  'Modern Truth: "In a world of [current trend], [contrasting wisdom]"'
] as const

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

function validateQuote(quote: string): boolean {
  // Remove any hex color codes and extra whitespace
  const quoteWithoutColors = quote.replace(/#[a-zA-Z0-9]{6}/g, '') // Updated regex
                                 .replace(/#[a-zA-Z0-9]{3,}/g, '')  // Catch other variations
                                 .trim();
  
  // Length check
  if (quoteWithoutColors.length > 120 || quoteWithoutColors.length < 20) return false
  
  // Cliché check
  const clichés = [
    'live laugh love',
    'everything happens for a reason',
    'follow your dreams'
  ]
  if (clichés.some(cliché => quoteWithoutColors.toLowerCase().includes(cliché))) return false
  
  // Structure check
  if (quoteWithoutColors.split(' ').length < 5) return false
  
  // Check for any remaining technical patterns
  const technicalPatterns = [
    /#/,           // Hash symbols
    /\{.*?\}/,     // Curly braces
    /\[.*?\]/,     // Square brackets
    /rgb\(.*?\)/,  // RGB colors
    /rgba\(.*?\)/, // RGBA colors
  ]
  
  if (technicalPatterns.some(pattern => pattern.test(quoteWithoutColors))) return false
  
  return true
}

export async function generateQuote(prompt: string, style?: typeof QUOTE_STYLES[number]): Promise<{ text: string; style: typeof QUOTE_STYLES[number] }> {
  try {
    // Add input validation
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Please enter a topic for your quote')
    }

    // 30% chance to fetch a real quote from Quotable API
    if (Math.random() < 0.3) {
      const realQuote = await getQuotableQuote(prompt)
      if (realQuote) return {
        text: realQuote,
        style: style || QUOTE_STYLES[Math.floor(Math.random() * QUOTE_STYLES.length)]
      }
    }

    const basePrompt = `Create an original, thought-provoking quote with these requirements:
    - Must be unexpected and avoid common wisdom
    - Challenge conventional thinking
    - Use specific, concrete language instead of abstract concepts
    - Create a unique perspective that surprises the reader
    - Avoid overused metaphors and spiritual/journey references
    - Make it relevant to modern life and current challenges
    - Maximum 120 characters
    
    AVOID these overused patterns:
    - "Journey/path to success/happiness"
    - "Embrace/believe in yourself"
    - Generic "growth/change" metaphors
    - Vague spiritual references
    - Common motivational phrases`

    const fullPrompt = prompt 
      ? `${basePrompt}
        Topic: ${prompt}
        Additional requirements:
        - Incorporate the topic naturally
        - Maintain authenticity and originality
        - Avoid generic statements about the topic`
      : basePrompt

    // const shouldUseRealQuote = Math.random() < 0.3 //30% of using real quotes
    const randomFactor = Math.random().toString(36).substring(7)

    const selectedStyle = style || QUOTE_STYLES[Math.floor(Math.random() * QUOTE_STYLES.length)]
    
    const stylePrompt = `Style: ${selectedStyle}
    If style is:
    - motivational: Focus on specific actions and concrete results
    - philosophical: Challenge assumptions with original insights
    - practical wisdom: Give unexpected but useful advice
    - thought-provoking: Subvert common beliefs
    - emotional: Focus on specific feelings and situations
    - humorous wisdom: Use clever wordplay or ironic observations
    - paradoxical: Reveal truth through apparent contradictions
    - metaphorical: Use fresh, modern comparisons
    - contrarian: Challenge popular wisdom with evidence
    - storytelling: Frame wisdom through micro-narratives`

    const structure = QUOTE_STRUCTURES[Math.floor(Math.random() * QUOTE_STRUCTURES.length)]
    
    const structurePrompt = `Optional structure suggestion: ${structure}
    Feel free to use this structure if it fits naturally with the topic and style.`

    let attempts = 0
    let validQuote = ''
    
    while (attempts < 3) {
      const { text } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt: `${fullPrompt}\n${stylePrompt}\n${structurePrompt}\n(Random factor: ${randomFactor})
        IMPORTANT RULES:
        1. Return ONLY the quote text
        2. DO NOT use common motivational phrases
        3. BE SPECIFIC and ORIGINAL
        4. NO journey/path metaphors
        5. NO generic self-help language`,
        temperature: 0.9,
        maxTokens: 60,
      })
      // Clean the quote more aggressively
      const quote = text.replace(/["']/g, '')
                       .replace(/#[a-zA-Z0-9]{3,}/g, '')
                       .replace(/\{.*?\}/g, '')
                       .replace(/\[.*?\]/g, '')
                       .replace(/rgb\(.*?\)/g, '')
                       .replace(/rgba\(.*?\)/g, '')
                       .trim()
      
      if (validateQuote(quote)) {
        validQuote = quote
        break
      }
      attempts++
    }
    
    if (!validQuote) throw new Error('Could not generate a valid quote')
    return {
      text: validQuote,
      style: selectedStyle
    }
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

