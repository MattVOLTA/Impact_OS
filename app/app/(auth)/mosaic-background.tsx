'use client'

import { useEffect, useState } from 'react'

const COLORS = [
  '#1e293b', // Slate 800
  '#2563eb', // Blue 600
  '#3b82f6', // Blue 500
  '#22d3ee', // Cyan 400
  '#facc15', // Yellow 400
  '#fb923c', // Orange 400
  '#ef4444', // Red 500
  '#8b5cf6', // Violet 500
]

export function MosaicBackground() {
  const [squares, setSquares] = useState<string[]>([])
  const [gridDimensions, setGridDimensions] = useState({ cols: 0, rows: 0 })

  useEffect(() => {
    // Use window.screen dimensions to ensure we cover the largest possible area of the monitor
    // This handles maximizing the window later without needing resize listeners
    const width = typeof window !== 'undefined' ? window.screen.width : 1920
    const height = typeof window !== 'undefined' ? window.screen.height : 1080
    
    // Cell size (4rem = 64px) + Gap (0.25rem = 4px) = 68px
    const cellSize = 68
    
    // Add ample buffer
    const cols = Math.ceil(width / cellSize) + 10
    const rows = Math.ceil(height / cellSize) + 10
    
    setGridDimensions({ cols, rows })
    
    const count = cols * rows
    const newSquares = Array.from({ length: count }, () => {
      return COLORS[Math.floor(Math.random() * COLORS.length)]
    })
    setSquares(newSquares)
  }, [])

  if (squares.length === 0) return null

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-slate-950">
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-1 opacity-80 blur-[0.5px]"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridDimensions.cols}, 4rem)`,
          gridTemplateRows: `repeat(${gridDimensions.rows}, 4rem)`,
        }}
      >
        {squares.map((color, i) => (
          <div
            key={i}
            className="h-16 w-16 transition-colors duration-1000 hover:opacity-100 hover:brightness-110"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.3)_100%)]" />
    </div>
  )
}
