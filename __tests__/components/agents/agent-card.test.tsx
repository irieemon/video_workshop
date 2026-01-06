/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { AgentCard } from '@/components/agents/agent-card'

describe('AgentCard', () => {
  const defaultProps = {
    agent: 'director',
    response: 'This scene would benefit from a dramatic opening shot.',
  }

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the agent card with response text', () => {
      render(<AgentCard {...defaultProps} />)

      expect(screen.getByText('This scene would benefit from a dramatic opening shot.')).toBeInTheDocument()
    })

    it('renders the agent name', () => {
      render(<AgentCard {...defaultProps} />)

      expect(screen.getByText('Director')).toBeInTheDocument()
    })

    it('renders with proper container structure', () => {
      const { container } = render(<AgentCard {...defaultProps} />)

      const card = container.querySelector('.rounded-lg')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('border-l-4')
    })
  })

  // ============================================================================
  // Agent Types
  // ============================================================================
  describe('Agent Types', () => {
    it('renders director agent correctly', () => {
      render(<AgentCard agent="director" response="Director response" />)

      expect(screen.getByText('Director')).toBeInTheDocument()
    })

    it('renders cinematographer agent correctly', () => {
      render(<AgentCard agent="cinematographer" response="Camera angle suggestion" />)

      expect(screen.getByText('Cinematographer')).toBeInTheDocument()
    })

    it('renders editor agent correctly', () => {
      render(<AgentCard agent="editor" response="Edit timing feedback" />)

      expect(screen.getByText('Editor')).toBeInTheDocument()
    })

    it('renders colorist agent correctly', () => {
      render(<AgentCard agent="colorist" response="Color grading notes" />)

      expect(screen.getByText('Colorist')).toBeInTheDocument()
    })

    it('renders platform_expert agent correctly', () => {
      render(<AgentCard agent="platform_expert" response="TikTok optimization tips" />)

      expect(screen.getByText('Platform Expert')).toBeInTheDocument()
    })

    it('falls back to director config for unknown agent', () => {
      render(<AgentCard agent="unknown_agent" response="Unknown response" />)

      // Falls back to director config
      expect(screen.getByText('Director')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Challenge Badges
  // ============================================================================
  describe('Challenge Badges', () => {
    it('renders challenge badge when isChallenge is true', () => {
      render(
        <AgentCard
          agent="editor"
          response="I disagree with the director"
          isChallenge={true}
          respondingTo="director"
        />
      )

      expect(screen.getByText('Challenges Director')).toBeInTheDocument()
    })

    it('renders response badge when respondingTo is set without challenge', () => {
      render(
        <AgentCard
          agent="cinematographer"
          response="Building on the director idea"
          respondingTo="director"
        />
      )

      expect(screen.getByText('Responds to Director')).toBeInTheDocument()
    })

    it('shows agent name in challenge badge based on config', () => {
      render(
        <AgentCard
          agent="editor"
          response="Challenge response"
          isChallenge={true}
          respondingTo="cinematographer"
        />
      )

      expect(screen.getByText('Challenges Cinematographer')).toBeInTheDocument()
    })

    it('falls back to raw name when responding to unknown agent', () => {
      render(
        <AgentCard
          agent="director"
          response="Response"
          respondingTo="unknown_agent"
        />
      )

      expect(screen.getByText('Responds to unknown_agent')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Building On Consensus
  // ============================================================================
  describe('Building On Consensus', () => {
    it('renders builds on consensus badge when buildingOn has items', () => {
      render(
        <AgentCard
          agent="editor"
          response="Incorporating all feedback"
          buildingOn={['director', 'cinematographer']}
        />
      )

      expect(screen.getByText('Builds on consensus')).toBeInTheDocument()
    })

    it('does not render consensus badge when buildingOn is empty', () => {
      render(
        <AgentCard
          agent="editor"
          response="Solo response"
          buildingOn={[]}
        />
      )

      expect(screen.queryByText('Builds on consensus')).not.toBeInTheDocument()
    })

    it('does not render consensus badge when buildingOn is undefined', () => {
      render(<AgentCard agent="editor" response="No building on" />)

      expect(screen.queryByText('Builds on consensus')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Multiple Badges
  // ============================================================================
  describe('Multiple Badges', () => {
    it('shows challenge badge without consensus badge', () => {
      render(
        <AgentCard
          agent="editor"
          response="Challenge response"
          isChallenge={true}
          respondingTo="director"
        />
      )

      expect(screen.getByText('Challenges Director')).toBeInTheDocument()
      expect(screen.queryByText('Responds to Director')).not.toBeInTheDocument()
    })

    it('can show both response and consensus badges', () => {
      render(
        <AgentCard
          agent="editor"
          response="Building response"
          respondingTo="director"
          buildingOn={['cinematographer']}
        />
      )

      expect(screen.getByText('Responds to Director')).toBeInTheDocument()
      expect(screen.getByText('Builds on consensus')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Icon Rendering
  // ============================================================================
  describe('Icon Rendering', () => {
    it('renders an icon for the agent', () => {
      const { container } = render(<AgentCard {...defaultProps} />)

      // Icons are rendered as SVGs
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders icon with correct class', () => {
      const { container } = render(<AgentCard {...defaultProps} />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-5')
      expect(svg).toHaveClass('w-5')
    })
  })

  // ============================================================================
  // Styling
  // ============================================================================
  describe('Styling', () => {
    it('applies correct border color class based on agent', () => {
      const { container } = render(<AgentCard agent="director" response="test" />)

      const card = container.querySelector('.rounded-lg')
      expect(card).toHaveClass('border-l-[#3B4A5C]')
    })

    it('applies different border color for cinematographer', () => {
      const { container } = render(<AgentCard agent="cinematographer" response="test" />)

      const card = container.querySelector('.rounded-lg')
      expect(card).toHaveClass('border-l-[#7C9473]')
    })

    it('applies different border color for editor', () => {
      const { container } = render(<AgentCard agent="editor" response="test" />)

      const card = container.querySelector('.rounded-lg')
      expect(card).toHaveClass('border-l-[#C97064]')
    })

    it('applies different border color for colorist', () => {
      const { container } = render(<AgentCard agent="colorist" response="test" />)

      const card = container.querySelector('.rounded-lg')
      expect(card).toHaveClass('border-l-[#8B7C6B]')
    })

    it('applies different border color for platform_expert', () => {
      const { container } = render(<AgentCard agent="platform_expert" response="test" />)

      const card = container.querySelector('.rounded-lg')
      expect(card).toHaveClass('border-l-[#5A6D52]')
    })
  })

  // ============================================================================
  // Response Content
  // ============================================================================
  describe('Response Content', () => {
    it('renders long response text', () => {
      const longResponse = 'A'.repeat(500)
      render(<AgentCard agent="director" response={longResponse} />)

      expect(screen.getByText(longResponse)).toBeInTheDocument()
    })

    it('renders response with special characters', () => {
      const response = 'The shot should be "cinematic" & dramatic!'
      render(<AgentCard agent="director" response={response} />)

      expect(screen.getByText(response)).toBeInTheDocument()
    })

    it('renders response with newlines preserved in DOM', () => {
      const response = 'Line 1. Line 2.'
      render(<AgentCard agent="director" response={response} />)

      expect(screen.getByText(response)).toBeInTheDocument()
    })
  })
})
