'use client'

import { useState } from 'react'
import { ConceptEpisodesDisplay, ConceptEpisode, ConceptSeason } from './concept-episodes-display'
import { EpisodeConceptReviewDialog } from './episode-concept-review-dialog'
import { ScreenplayChat, EpisodeConcept } from '../screenplay/screenplay-chat'

interface ConceptEpisodesWithScreenplayProps {
  seasons: ConceptSeason[]
  seriesId: string
  seriesName: string
  onEpisodeCreated?: () => void // Callback to refresh episode list
}

export function ConceptEpisodesWithScreenplay({
  seasons,
  seriesId,
  seriesName,
  onEpisodeCreated,
}: ConceptEpisodesWithScreenplayProps) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<ConceptEpisode | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<ConceptSeason | null>(null)

  const handleEpisodeClick = (episode: ConceptEpisode, season: ConceptSeason) => {
    setSelectedEpisode(episode)
    setSelectedSeason(season)
    setReviewOpen(true)
  }

  const handleCreateEpisode = () => {
    if (!selectedEpisode || !selectedSeason) return

    // Transform the concept data into the format expected by ScreenplayChat
    const conceptData: EpisodeConcept = {
      episode_number: selectedEpisode.episode_number,
      season_number: selectedSeason.season_number,
      title: selectedEpisode.title,
      logline: selectedEpisode.logline,
      plot_summary: selectedEpisode.plot_summary,
      character_focus: selectedEpisode.character_focus,
      season_title: selectedSeason.title,
      season_arc: selectedSeason.arc,
    }

    setReviewOpen(false)
    setChatOpen(true)
  }

  const handleReviewClose = () => {
    setReviewOpen(false)
    setSelectedEpisode(null)
    setSelectedSeason(null)
  }

  const handleChatClose = () => {
    setChatOpen(false)
    setSelectedEpisode(null)
    setSelectedSeason(null)
    // Trigger episode list refresh if callback provided
    if (onEpisodeCreated) {
      onEpisodeCreated()
    }
  }

  return (
    <>
      <ConceptEpisodesDisplay
        seasons={seasons}
        onEpisodeClick={handleEpisodeClick}
      />

      <EpisodeConceptReviewDialog
        open={reviewOpen}
        onClose={handleReviewClose}
        episode={selectedEpisode}
        season={selectedSeason}
        seriesName={seriesName}
        onCreateEpisode={handleCreateEpisode}
      />

      {chatOpen && selectedEpisode && selectedSeason && (
        <ScreenplayChat
          open={chatOpen}
          onClose={handleChatClose}
          seriesId={seriesId}
          seriesName={seriesName}
          targetType="episode"
          initialConcept={{
            episode_number: selectedEpisode.episode_number,
            season_number: selectedSeason.season_number,
            title: selectedEpisode.title,
            logline: selectedEpisode.logline,
            plot_summary: selectedEpisode.plot_summary,
            character_focus: selectedEpisode.character_focus,
            season_title: selectedSeason.title,
            season_arc: selectedSeason.arc,
          }}
        />
      )}
    </>
  )
}
