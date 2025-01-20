import { Configuration, OpenAIApi } from 'openai';
import { NextResponse } from 'next/server';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function POST(req: Request) {
  if (!configuration.apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { userPreferences } = await req.json();
    
    const prompt = generatePrompt(userPreferences);
    const completion = await openai.createChatCompletion({
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

    const suggestion = completion.data.choices[0]?.message?.content;
    return NextResponse.json({ result: suggestion });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return NextResponse.json(
      { error: 'An error occurred during your request.' },
      { status: 500 }
    );
  }
}

function generatePrompt(preferences: any) {
  const {
    gender,
    relationshipStatus,
    areasToImprove,
    personalGoals,
    preferredStyles,
    userStreak
  } = preferences;

  let prompt = "Generate a creative and unique quote prompt that:";

  // Add style preferences
  if (preferredStyles?.length > 0) {
    prompt += `\n- Incorporates one or more of these styles: ${preferredStyles.join(', ')}`;
  }

  // Add personal goals
  if (personalGoals) {
    prompt += `\n- Aligns with personal goals: ${personalGoals}`;
  }

  // Add areas of improvement
  if (areasToImprove?.length > 0) {
    prompt += `\n- Focuses on these areas: ${areasToImprove.join(', ')}`;
  }

  // Add relationship context
  if (relationshipStatus && relationshipStatus !== 'Prefer not to say') {
    prompt += `\n- Considers relationship status: ${relationshipStatus}`;
  }

  // Add streak motivation
  if (userStreak > 0) {
    prompt += `\n- Incorporates motivation for maintaining a ${userStreak}-day streak`;
  }

  prompt += "\n\nThe prompt should be specific, creative, and avoid generic themes. Focus on creating a unique angle or perspective.";

  return prompt;
} 