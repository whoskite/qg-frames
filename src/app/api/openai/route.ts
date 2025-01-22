import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { userPreferences } = await req.json();
    
    const prompt = generatePrompt(userPreferences);
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a creative writing assistant specializing in generating unique and personalized quote prompts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 100
    });

    const suggestion = completion.choices[0]?.message?.content;
    return NextResponse.json({ result: suggestion });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return NextResponse.json(
      { error: 'An error occurred during your request.' },
      { status: 500 }
    );
  }
}

interface UserPreferences {
  gender?: string;
  relationshipStatus?: string;
  areasToImprove?: string[];
  personalGoals?: string;
  preferredStyles?: string[];
}

function generatePrompt(preferences: UserPreferences): string {
  const {
    relationshipStatus,
    areasToImprove,
    personalGoals,
    preferredStyles
  } = preferences;

  let prompt = "Generate a creative and unique quote that:";

  // Add style preferences
  if (preferredStyles && preferredStyles.length > 0) {
    prompt += `\n- Incorporates one or more of these styles: ${preferredStyles.join(', ')}`;
  }

  // Add personal goals
  if (personalGoals) {
    prompt += `\n- Aligns with personal goals: ${personalGoals}`;
  }

  // Add areas of improvement
  if (areasToImprove && areasToImprove.length > 0) {
    prompt += `\n- Focuses on these areas: ${areasToImprove.join(', ')}`;
  }

  // Add relationship context
  if (relationshipStatus && relationshipStatus !== 'Prefer not to say') {
    prompt += `\n- Considers relationship status: ${relationshipStatus}`;
  }

  prompt += "\n\nThe prompt should be specific, creative, and avoid generic themes. Focus on creating a unique angle or perspective.";

  return prompt;
} 