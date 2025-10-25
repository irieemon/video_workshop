'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConceptAgentDialog } from '@/components/series/concept-agent-dialog';
import { ConceptPreview } from '@/components/series/concept-preview';
import type { SeriesConceptOutput } from '@/lib/types/series-concept.types';

export default function SeriesConceptPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(true);
  const [generatedConcept, setGeneratedConcept] = useState<SeriesConceptOutput | null>(null);

  const handleConceptGenerated = (concept: SeriesConceptOutput) => {
    setGeneratedConcept(concept);
    setDialogOpen(false);
  };

  const handleBackToDialogue = () => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    // Navigate back to series list if dialog closed without generating concept
    if (!generatedConcept) {
      router.push('/dashboard/series');
    }
  };

  // If dialog is closed and no concept, navigate back
  useEffect(() => {
    if (!dialogOpen && !generatedConcept) {
      router.push('/dashboard/series');
    }
  }, [dialogOpen, generatedConcept, router]);

  return (
    <div className="min-h-screen">
      {!generatedConcept ? (
        <ConceptAgentDialog
          open={dialogOpen}
          onClose={handleClose}
          onConceptGenerated={handleConceptGenerated}
        />
      ) : (
        <ConceptPreview concept={generatedConcept} onBack={handleBackToDialogue} />
      )}
    </div>
  );
}
