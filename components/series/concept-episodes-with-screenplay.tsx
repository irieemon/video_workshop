'use client'

import { useState } from 'react'
import { ConceptEpisodesDisplay, ConceptEpisode, ConceptSeason } from './concept-episodes-display'
import { ScreenplayChat, EpisodeConcept } from '../screenplay/screenplay-chat'

interface ConceptEpisodesWithScreenplayProps {
  seasons: ConceptSeason[]
  seriesId: string
  seriesName: string
}

export function ConceptEpisodesWithScreenplay({
  seasons,
  seriesId,
  seriesName,
}: ConceptEpisodesWithScreenplayProps) {
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedConcept, setSelectedConcept] = useState<EpisodeConcept | null>(null)

  const handleEpisodeClick = (episode: ConceptEpisode, season: ConceptSeason) => {
    // Transform the concept data into the format expected by ScreenplayChat
    const conceptData: EpisodeConcept = {
      episode_number: episode.episode_number,
      season_number: season.season_number,
      title: episode.title,
      logline: episode.logline,
      plot_summary: episode.plot_summary,
      character_focus: episode.character_focus,
      season_title: season.title,
      season_arc: season.arc,
    }

    setSelectedConcept(conceptData)
    setChatOpen(true)
  }

  return (
    <>
      <ConceptEpisodesDisplay
        seasons={seasons}
        onEpisodeClick={handleEpisodeClick}
      />

      <ScreenplayChat
        open={chatOpen}
        onClose={() => {
          setChatOpen(false)
          setSelectedConcept(null)
        }}
        seriesId={seriesId}
        seriesName={seriesName}
        targetType="episode"
        initialConcept={selectedConcept ?? undefined}
      />
    </>
  )
}
