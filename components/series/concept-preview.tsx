'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { SeriesConceptOutput } from '@/lib/types/series-concept.types';

interface ConceptPreviewProps {
  concept: SeriesConceptOutput;
  onBack: () => void;
  projectId?: string;
}

export function ConceptPreview({ concept, onBack, projectId }: ConceptPreviewProps) {
  const [isPersisting, setIsPersisting] = useState(false);
  const router = useRouter();

  const persistConcept = async () => {
    setIsPersisting(true);

    try {
      const response = await fetch('/api/series/concept/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, projectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create series');
      }

      // Redirect to appropriate page
      if (projectId) {
        router.push(`/dashboard/projects/${projectId}`);
      } else {
        router.push(`/dashboard/series/${data.seriesId}`);
      }
    } catch (error: any) {
      console.error('Failed to persist concept:', error);
      alert(`Failed to create series: ${error.message}`);
      setIsPersisting(false);
    }
  };

  const totalEpisodes = concept.seasons.reduce((sum, season) => sum + season.episodes.length, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isPersisting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dialogue
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">{concept.series.name}</h1>
          <p className="text-muted-foreground mb-4">{concept.series.logline}</p>
          <div className="flex flex-wrap gap-2">
            <Badge>{concept.series.genre}</Badge>
            <Badge variant="outline">{concept.seasons.length} Seasons</Badge>
            <Badge variant="outline">{totalEpisodes} Episodes</Badge>
            <Badge variant="outline">{concept.characters.length} Characters</Badge>
            <Badge variant="outline">{concept.settings.length} Settings</Badge>
          </div>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Premise</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{concept.series.premise}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Themes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {concept.series.themes.map((theme, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {theme}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Format & Tone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Format:</span> {concept.series.format}
              </p>
              <p className="text-sm">
                <span className="font-medium">Tone:</span> {concept.series.tone}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasons" className="space-y-4">
          {concept.seasons.map((season) => (
            <Card key={season.season_number}>
              <CardHeader>
                <CardTitle>
                  Season {season.season_number}: {season.title}
                </CardTitle>
                <CardDescription>{season.episodes.length} episodes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{season.arc}</p>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Episodes:</h4>
                  <div className="space-y-2">
                    {season.episodes.slice(0, 3).map((ep) => (
                      <div key={ep.episode_number} className="text-sm">
                        <span className="font-medium">
                          {ep.episode_number}. {ep.title}
                        </span>
                        <p className="text-muted-foreground">{ep.logline}</p>
                      </div>
                    ))}
                    {season.episodes.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {season.episodes.length - 3} more episodes
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="characters" className="space-y-4">
          {concept.characters.map((char) => (
            <Card key={char.name}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{char.name}</CardTitle>
                  <Badge variant={char.role === 'protagonist' ? 'default' : 'secondary'}>
                    {char.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{char.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Goal:</span> {char.dramatic_profile.goal}
                  </div>
                  <div>
                    <span className="font-medium">Flaw:</span> {char.dramatic_profile.flaw}
                  </div>
                  <div>
                    <span className="font-medium">Age:</span> {char.visual_fingerprint.age}
                  </div>
                  <div>
                    <span className="font-medium">Build:</span> {char.visual_fingerprint.build}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {concept.settings.map((setting) => (
            <Card key={setting.name}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{setting.name}</CardTitle>
                  <Badge variant={setting.importance === 'high' ? 'default' : 'outline'}>
                    {setting.importance}
                  </Badge>
                </div>
                <CardDescription>First appears: {setting.first_appearance}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{setting.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button onClick={persistConcept} disabled={isPersisting} size="lg">
          {isPersisting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Series...
            </>
          ) : (
            'Create Series'
          )}
        </Button>
        <Button onClick={onBack} variant="outline" disabled={isPersisting} size="lg">
          Refine with Agent
        </Button>
      </div>
    </div>
  );
}
