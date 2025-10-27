'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Film, Sparkles, Users, Target } from 'lucide-react'
import { ConceptEpisode, ConceptSeason } from './concept-episodes-display'

interface EpisodeConceptReviewDialogProps {
  open: boolean
  onClose: () => void
  episode: ConceptEpisode | null
  season: ConceptSeason | null
  seriesName: string
  onCreateEpisode: () => void
}

export function EpisodeConceptReviewDialog({
  open,
  onClose,
  episode,
  season,
  seriesName,
  onCreateEpisode,
}: EpisodeConceptReviewDialogProps) {
  if (!episode || !season) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <DialogTitle>Episode Concept Review</DialogTitle>
          </div>
          <DialogDescription>
            {seriesName} · Season {season.season_number}, Episode {episode.episode_number}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Episode Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">
                  S{season.season_number}E{episode.episode_number}
                </Badge>
                <h2 className="text-2xl font-bold">{episode.title}</h2>
              </div>
            </div>

            <Separator />

            {/* Logline */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                LOGLINE
              </h3>
              <p className="text-base italic border-l-4 border-primary pl-4 py-2">
                &quot;{episode.logline}&quot;
              </p>
            </div>

            {/* Season Context */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Season Arc Context</h3>
              <div className="space-y-1">
                <p className="text-sm">
                  <strong>Season {season.season_number}:</strong> {season.title}
                </p>
                <p className="text-sm text-muted-foreground">{season.arc}</p>
              </div>
            </div>

            {/* Plot Summary */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                PLOT SUMMARY
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {episode.plot_summary}
              </p>
            </div>

            {/* Character Focus */}
            {episode.character_focus && episode.character_focus.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  CHARACTER FOCUS
                </h3>
                <div className="flex flex-wrap gap-2">
                  {episode.character_focus.map((char) => (
                    <Badge key={char} variant="secondary" className="text-sm">
                      {char}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Ready to Create Episode?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    The AI screenplay writer will use this concept along with all series context
                    (characters, settings, relationships, and tone) to help you develop a detailed
                    episode screenplay with scene-by-scene breakdowns.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Interactive AI-assisted screenplay development</li>
                    <li>Scene structure and pacing guidance</li>
                    <li>Character dialogue and action suggestions</li>
                    <li>Full series continuity awareness</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onCreateEpisode} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Create Episode with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
