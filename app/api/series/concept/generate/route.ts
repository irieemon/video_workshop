import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { getModelForFeature } from '@/lib/ai/config';
import { SERIES_CONCEPT_AGENT_SYSTEM_PROMPT } from '@/lib/ai/series-concept-agent';
import { validateSeriesConcept, validateBusinessRules } from '@/lib/validation/series-concept-validator';
import yaml from 'js-yaml';
import type { ConceptDialogueState } from '@/lib/types/series-concept.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateRequest {
  dialogueState: ConceptDialogueState;
}

/**
 * POST /api/series/concept/generate
 * Generate final structured concept from dialogue history
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateRequest = await request.json();
    const { dialogueState } = body;

    // Build generation prompt
    const generationPrompt = `
Based on our conversation, generate the complete series concept in the specified YAML format.
Ensure all elements (characters, seasons, relationships, settings) are fully developed.

CRITICAL VALIDATION REQUIREMENTS:
- Include at least 3 seasons with 6+ episodes each
- Create at least 6 characters with complete profiles
- Define at least 4 settings
- Map at least 5 character relationships

MANDATORY: Character name consistency
- Every name in episode "character_focus" arrays MUST exactly match a name from your characters list
- Every "character_a" and "character_b" in relationships MUST exactly match names from your characters list
- Use EXACT spelling and capitalization (e.g., if you define "Lira Vance" as a character, use "Lira Vance" everywhere, not "Lira" or "Captain Vance")

MANDATORY: Enum values
- Character "role" must be EXACTLY: "protagonist", "antagonist", or "supporting" (lowercase, no additional text)
- Relationship "type" must be EXACTLY: "ally", "rival", "family", "romantic", or "mentor" (lowercase, single word)
- Setting "importance" must be EXACTLY: "high", "medium", or "low" (lowercase)

Generate the YAML now.
`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SERIES_CONCEPT_AGENT_SYSTEM_PROMPT },
      ...dialogueState.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: generationPrompt },
    ];

    const response = await openai.chat.completions.create({
      model: getModelForFeature('agent'),
      messages,
      temperature: 0.6, // Lower temp for structured output
    });

    // Parse YAML from response
    const rawOutput = response.choices[0].message.content || '';

    // Extract YAML from code block
    const yamlMatch = rawOutput.match(/```yaml\n([\s\S]+?)\n```/);

    if (!yamlMatch) {
      return NextResponse.json(
        { error: 'Failed to extract YAML from response', rawOutput },
        { status: 500 }
      );
    }

    let parsedYaml: any;
    try {
      parsedYaml = yaml.load(yamlMatch[1]);
    } catch (yamlError: any) {
      return NextResponse.json(
        {
          error: 'YAML parsing failed',
          details: yamlError.message,
          rawYaml: yamlMatch[1],
        },
        { status: 500 }
      );
    }

    // Validate schema
    const validation = validateSeriesConcept(parsedYaml);
    if (!validation.success) {
      console.error('Schema validation failed:', validation.errors?.format());
      console.error('Parsed YAML:', JSON.stringify(parsedYaml, null, 2));
      return NextResponse.json(
        {
          error: 'Invalid concept structure',
          details: validation.errors?.format(),
          parsedData: parsedYaml, // Include in response for debugging
        },
        { status: 400 }
      );
    }

    // Validate business rules
    const businessValidation = validateBusinessRules(validation.data!);
    if (!businessValidation.valid) {
      console.error('Business rule validation failed:', businessValidation.errors);
      console.error('Validated data:', JSON.stringify(validation.data, null, 2));
      return NextResponse.json(
        {
          error: 'Business rule violations',
          details: businessValidation.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      concept: validation.data,
    });
  } catch (error: any) {
    console.error('Series concept generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
