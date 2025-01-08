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

// Add these types for better organization
type QuoteStyle = 'inspirational' | 'funny' | 'thoughtful' | 'witty' | 'profound';
type QuoteContext = {
  style: QuoteStyle;
  theme?: string;
  emotion?: string;
};

type QuoteResponse = {
  text: string;
  style: QuoteStyle;
};

export async function generateQuote(userPrompt: string): Promise<QuoteResponse> {
  try {
    // Define different styles and contexts for variety
    const styles: QuoteContext[] = [
      { 
        style: 'inspirational',
        emotion: 'uplifting',
        theme: 'growth and achievement'
      },
      { 
        style: 'funny',
        emotion: 'playful',
        theme: 'life observations'
      },
      { 
        style: 'thoughtful',
        emotion: 'reflective',
        theme: 'wisdom and insight'
      },
      { 
        style: 'witty',
        emotion: 'clever',
        theme: 'smart humor'
      },
      { 
        style: 'profound',
        emotion: 'deep',
        theme: 'life meaning'
      }
    ];

    // Randomly select a style
    const selectedStyle = styles[Math.floor(Math.random() * styles.length)];

    // Create a more varied prompt for the AI
    const enhancedPrompt = `Generate a ${selectedStyle.style} quote that is ${selectedStyle.emotion} in tone${
      userPrompt ? ` and relates to "${userPrompt}"` : ''
    }. The quote should:
    - Be original and memorable
    - Include creative metaphors or analogies
    - Be between 10-30 words
    - Focus on ${selectedStyle.theme}
    - Be engaging and shareable
    - Avoid clichés and overused phrases
    - Have a natural, conversational flow`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a creative quote generator that specializes in ${selectedStyle.style} quotes. 
            Your quotes are original, memorable, and avoid clichés. 
            You use fresh metaphors and contemporary language.`
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.9, // Increased for more creativity
        max_tokens: 100,
        presence_penalty: 0.6, // Encourages more unique outputs
        frequency_penalty: 0.7 // Reduces repetition
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate quote');
    }

    const data = await response.json();
    const generatedQuote = data.choices[0].message.content.trim();

    // Return both the quote and its style
    return {
      text: generatedQuote.replace(/^["']|["']$/g, ''),
      style: selectedStyle.style
    };

  } catch (error) {
    console.error('Error generating quote:', error);
    throw error;
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

