import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userPreferences } = body;

    const prompt = generatePrompt(userPreferences);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates personalized quote suggestions based on user preferences."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return NextResponse.json({
      result: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote suggestion' },
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