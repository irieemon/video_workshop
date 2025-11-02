'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { CharacterRelationshipWithDetails, RelationshipType } from '@/lib/types/database.types'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="h-[500px] flex items-center justify-center bg-muted/50 rounded-lg">Loading graph...</div>
})

interface Character {
  id: string
  name: string
  role?: string | null
}

interface RelationshipGraphProps {
  characters: Character[]
  relationships: CharacterRelationshipWithDetails[]
  onNodeClick?: (characterId: string) => void
  onLinkClick?: (relationshipId: string) => void
}

// Color scheme for different relationship types
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  friends: '#10b981', // green
  rivals: '#ef4444', // red
  romantic: '#ec4899', // pink
  family: '#8b5cf6', // purple
  allies: '#3b82f6', // blue
  enemies: '#dc2626', // dark red
  mentor_student: '#f59e0b', // amber
  custom: '#6b7280', // gray
}

export function RelationshipGraph({
  characters,
  relationships,
  onNodeClick,
  onLinkClick,
}: RelationshipGraphProps) {
  const graphRef = useRef<any>(null)
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })

  useEffect(() => {
    // Build graph data from characters and relationships
    const nodes = characters.map((char) => ({
      id: char.id,
      name: char.name,
      role: char.role,
      val: 10, // Node size
    }))

    const links = relationships.map((rel) => ({
      id: rel.id,
      source: rel.character_a_id,
      target: rel.character_b_id,
      relationshipType: rel.relationship_type,
      customLabel: rel.custom_label,
      isSymmetric: rel.is_symmetric,
      description: rel.description,
      intensity: rel.intensity || 5,
      color: RELATIONSHIP_COLORS[rel.relationship_type as RelationshipType],
    }))

    setGraphData({ nodes, links })
  }, [characters, relationships])

  const handleNodeClick = (node: any) => {
    if (onNodeClick) {
      onNodeClick(node.id)
    }
  }

  const handleLinkClick = (link: any) => {
    if (onLinkClick) {
      onLinkClick(link.id)
    }
  }

  if (!graphData.nodes.length) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/50 rounded-lg">
        <div className="text-center text-muted-foreground">
          <p className="mb-2">No characters defined yet</p>
          <p className="text-sm">Add characters to see the relationship graph</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur border rounded-lg p-3 text-xs space-y-1">
        <div className="font-semibold mb-2">Relationship Types</div>
        {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t text-muted-foreground">
          <div>→ One-way relationship</div>
          <div>↔ Mutual relationship</div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={800}
          height={500}
          nodeLabel={(node: any) => `${node.name}${node.role ? ` (${node.role})` : ''}`}
          nodeCanvasObjectMode={() => 'replace'}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name
            const fontSize = 12 / globalScale
            ctx.font = `${fontSize}px Sans-Serif`

            // Draw node circle
            ctx.beginPath()
            ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false)
            ctx.fillStyle = '#3b82f6' // blue
            ctx.fill()
            ctx.strokeStyle = '#1e40af' // dark blue
            ctx.lineWidth = 1 / globalScale
            ctx.stroke()

            // Draw label
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#fff'
            ctx.fillText(label, node.x, node.y)
          }}
          linkLabel={(link: any) => {
            const label = link.customLabel || link.relationshipType.replace('_', ' ')
            const description = link.description ? `\n${link.description}` : ''
            const directionality = link.isSymmetric ? '↔' : '→'
            return `${directionality} ${label}${description}`
          }}
          linkColor={(link: any) => link.color}
          linkWidth={(link: any) => (link.intensity / 5) * 2}
          linkDirectionalArrowLength={(link: any) => (link.isSymmetric ? 0 : 6)}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.2}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          cooldownTicks={100}
          onEngineStop={() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400, 50)
            }
          }}
        />
      </div>

      <div className="mt-4 text-sm text-muted-foreground text-center">
        Click and drag nodes to rearrange • Scroll to zoom • Click nodes or edges for details
      </div>
    </div>
  )
}
