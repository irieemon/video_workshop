import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SeriesConceptPersister } from '@/lib/services/series-concept-persister';
import { validateSeriesConcept } from '@/lib/validation/series-concept-validator';
import type { SeriesConceptOutput } from '@/lib/types/series-concept.types';

interface PersistRequest {
  concept: SeriesConceptOutput;
}

/**
 * POST /api/series/concept/persist
 * Persist validated concept to database
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

    const body: PersistRequest = await request.json();
    const { concept } = body;

    // Validate one more time (defense in depth)
    const validation = validateSeriesConcept(concept);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid concept structure', details: validation.errors?.format() },
        { status: 400 }
      );
    }

    // Persist to database
    const persister = new SeriesConceptPersister();
    const result = await persister.persistConcept(validation.data!, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      seriesId: result.seriesId,
    });
  } catch (error: any) {
    console.error('Series concept persistence error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
