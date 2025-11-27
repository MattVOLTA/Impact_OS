"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface InteractiveGridPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number
  height?: number
  squares?: [number, number] // Number of squares in [x, y]
  className?: string
  squaresClassName?: string
}

/**
 * A grid pattern that has a subtle 3D "lens" distortion effect on mouse hover
 * and a cascading depth trail with a diffused gradient glow.
 */
export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className,
  squaresClassName,
  ...props
}: InteractiveGridPatternProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    // Initial resize
    handleResize()
    window.addEventListener("resize", handleResize)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)

    // Grid configuration
    const gap = width
    const dotSize = 1.5
    
    // Animation loop
    const render = () => {
      if (!canvas || !ctx) return
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // 0. Draw Background Bloom (Radiating Light)
      // This sits behind the dots and creates the "atmosphere"
      // We use a large radial gradient centered on the mouse
      if (mousePos.x > -500) { // Only draw if mouse is on screen
        const bloomRadius = 500 // Increased slightly for better gradient spread
        const bloomGradient = ctx.createRadialGradient(
          mousePos.x, mousePos.y, 0,
          mousePos.x, mousePos.y, bloomRadius
        )
        
        // 3-Color Gradient (Darker/Richer)
        // 1. Core: Bright Cyan (Hot center)
        bloomGradient.addColorStop(0, "rgba(14, 165, 233, 0.3)") 
        
        // 2. Mid: Rich Violet/Indigo (Deep transition)
        bloomGradient.addColorStop(0.3, "rgba(124, 58, 237, 0.2)")
        
        // 3. Outer: Deep Blue (Fading edge)
        bloomGradient.addColorStop(0.6, "rgba(30, 58, 138, 0.1)")
        
        // Fade to transparent
        bloomGradient.addColorStop(1, "rgba(30, 58, 138, 0)")
        
        ctx.fillStyle = bloomGradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      const cols = Math.ceil(canvas.width / gap)
      const rows = Math.ceil(canvas.height / gap)
      
      // For light/dark mode detection
      const isDark = document.documentElement.classList.contains("dark")
      
      // Base colors
      const baseR = isDark ? 255 : 0
      const baseG = isDark ? 255 : 0
      const baseB = isDark ? 255 : 0

      // Glow colors (Cyan/Blue-ish: rgb(14, 165, 233))
      // We'll blend towards this color in the active zone
      const glowR = 14
      const glowG = 165
      const glowB = 233

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          // Original position
          const ox = i * gap
          const oy = j * gap
          
          // Calculate distance to mouse
          const dx = mousePos.x - ox
          const dy = mousePos.y - oy
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          // Interaction radius
          const interactionRadius = 300
          const gradientRadius = 150 
          const maxDisplacement = 4 
          
          // Base properties
          let x = ox
          let y = oy
          let size = dotSize
          let alpha = 0.2
          
          // Current Color (starts as base)
          let r = baseR
          let g = baseG
          let b = baseB

          // 1. Interaction (Distortion & Parallax)
          if (dist < interactionRadius) {
             const force = (interactionRadius - dist) / interactionRadius
             const angle = Math.atan2(dy, dx)
             
             // Main layer displacement (Surface)
             const displacement = force * maxDisplacement
             x -= Math.cos(angle) * displacement
             y -= Math.sin(angle) * displacement
             
             size = dotSize + (force * 1.0)
             alpha = 0.2 + (force * 0.2) 
          }

          // 2. Gradient Glow (Applied AFTER calculation to ensure it overrides)
          if (dist < gradientRadius) {
             const gradientForce = (gradientRadius - dist) / gradientRadius
             
             // Alpha & Size Boost
             alpha = Math.min(alpha + (gradientForce * 0.7), 0.9) 
             size = size + (gradientForce * 2.0)

             // Color Blending
             // As we get closer to center (gradientForce -> 1), we shift towards glow color
             const colorMix = gradientForce * 0.8 // Max 80% color mix
             
             r = r * (1 - colorMix) + glowR * colorMix
             g = g * (1 - colorMix) + glowG * colorMix
             b = b * (1 - colorMix) + glowB * colorMix
          }

          // 3. Render Depth Layers (Echo)
          if (dist < interactionRadius) {
             const layers = 5 
             for (let k = 1; k <= layers; k++) {
                const depthFactor = k / layers 
                
                const slantX = (mousePos.x - ox) * 0.06 * k
                const slantY = (mousePos.y - oy) * 0.06 * k

                const ex = x + slantX
                const ey = y + slantY
                
                let echoAlpha = (alpha * 0.4) * (1 - depthFactor)
                
                if (dist < gradientRadius) {
                   const gradientForce = (gradientRadius - dist) / gradientRadius
                   echoAlpha += (gradientForce * 0.2) * (1 - depthFactor)
                }
                
                const echoSize = size * (1 - depthFactor * 0.6)

                // Use the same blended color for echoes
                ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.min(echoAlpha, 0.8)})`
                ctx.beginPath()
                ctx.arc(ex, ey, echoSize, 0, Math.PI * 2)
                ctx.fill()
             }
          }

          // 4. Render Main Surface Dot
          ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [mousePos, width, height])

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden bg-gray-50 dark:bg-zinc-950", className)} {...props}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
      />
    </div>
  )
}
