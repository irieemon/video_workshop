'use client'

import { useRef } from 'react'
import { ConceptEpisodesWithScreenplay } from './concept-episodes-with-screenplay'
import { EpisodeManager } from '../screenplay/episode-manager'
import type { ConceptSeason } from './concept-episodes-display'

interface SeriesEpisodesCoordinatorProps {
  seasons?: ConceptSeason[]
  seriesId: string
  seriesName: string
}

/**
 * Client-side coordinator that manages both concept episodes and regular episodes
 * Ensures episode list refreshes when new episodes are created from concepts
 */
export function SeriesEpisodesCoordinator({
  seasons,
  seriesId,
  seriesName,
}: SeriesEpisodesCoordinatorProps) {
  // Ref to access EpisodeManager's refresh function
  const episodeManagerRef = useRef<{ refresh: () => void } | null>(null)

  const handleEpisodeCreated = () => {
    // When an episode is created from a concept, refresh the episode list
    if (episodeManagerRef.current) {
      episodeManagerRef.current.refresh()
    }
  }

  return (
    <>
      {/* Episode Manager */}
      <EpisodeManager
        ref={episodeManagerRef}
        seriesId={seriesId}
        seriesName={seriesName}
      />

      {/* Concept Episodes (if they exist) */}
      {seasons && seasons.length > 0 && (
        <>
          <div className="my-8" />
          <ConceptEpisodesWithScreenplay
            seasons={seasons}
            seriesId={seriesId}
            seriesName={seriesName}
            onEpisodeCreated={handleEpisodeCreated}
          />
        </>
      )}
    </>
  )
}
