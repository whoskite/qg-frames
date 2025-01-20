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
type QuoteStyle = 'casual' | 'direct' | 'eloquent' | 'poetic' | 'humorous' | 'spiritual' | 'philosophical';
type QuoteContext = {
  style: QuoteStyle;
  tone: string;
  approach: string;
};

type QuoteResponse = {
  text: string;
  style: QuoteStyle;
};

export async function generateQuote(userPrompt: string): Promise<QuoteResponse> {
  try {
    // Extract style from the prompt (it will be added by Demo.tsx)
    const styleMatch = userPrompt.match(/with a .* tone (in a |with |in an )?(casual|direct|eloquent|poetic|humorous|spiritual|philosophical)/i);
    const style = (styleMatch?.[2] || 'casual') as QuoteStyle;

    // Define style contexts
    const styleContexts: Record<QuoteStyle, QuoteContext> = {
      casual: {
        style: 'casual',
        tone: 'friendly and conversational',
        approach: 'Use everyday language and relatable examples. Make it feel like advice from a friend.'
      },
      direct: {
        style: 'direct',
        tone: 'clear and straightforward',
        approach: 'Be concise and to the point. No fluff or metaphors. Use strong, actionable statements.'
      },
      eloquent: {
        style: 'eloquent',
        tone: 'sophisticated and refined',
        approach: 'Use elevated language and well-crafted expressions. Include thoughtful insights and elegant phrasing.'
      },
      poetic: {
        style: 'poetic',
        tone: 'artistic and metaphorical',
        approach: 'Use vivid imagery, metaphors, and flowing language. Create a sense of rhythm and beauty.'
      },
      humorous: {
        style: 'humorous',
        tone: 'witty and playful',
        approach: 'Include clever wordplay, light humor, or amusing observations. Keep it fun but insightful.'
      },
      spiritual: {
        style: 'spiritual',
        tone: 'enlightening and holistic',
        approach: 'Draw from inner wisdom and universal truths. Use contemplative language that connects mind, body, and spirit. Include insights about consciousness and inner peace.'
      },
      philosophical: {
        style: 'philosophical',
        tone: 'thought-provoking and introspective',
        approach: 'Explore deep existential questions and universal truths. Use analytical yet accessible language. Balance logic with wisdom and encourage deeper contemplation.'
      }
    };

    const selectedContext = styleContexts[style];
    
    // Create a more specific prompt for the AI
    const enhancedPrompt = `Generate a quote that is ${selectedContext.tone} in style${
      userPrompt ? ` and relates to "${userPrompt}"` : ''
    }. The quote should:
    - Be original and memorable
    - ${selectedContext.approach}
    - Be between 10-30 words
    - Feel natural and engaging
    - Avoid clichés and overused phrases
    - Have a consistent tone throughout`;

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
            content: `You are a creative quote generator that specializes in ${selectedContext.tone} quotes. 
            Your quotes are original, memorable, and avoid clichés. 
            ${selectedContext.approach}`
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.9,
        max_tokens: 100,
        presence_penalty: 0.6,
        frequency_penalty: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate quote');
    }
    
    const data = await response.json();
    const generatedQuote = data.choices[0].message.content.trim();

    return {
      text: generatedQuote.replace(/^["']|["']$/g, ''),
      style: style
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

