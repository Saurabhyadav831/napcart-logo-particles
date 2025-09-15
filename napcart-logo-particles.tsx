"use client"

import { useRef, useEffect, useState } from "react"
import { NAPCART_LOGO_PATH } from "./napcart-logo-path"

export default function LogoParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const isTouchingRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const updateCanvasSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      canvas.width = width
      canvas.height = height
      
      // More granular responsive breakpoints
      setIsMobile(width < 640) // sm breakpoint
      setIsTablet(width >= 640 && width < 1024) // md breakpoint
    }

    updateCanvasSize()

    let particles: {
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      color: string
      scatteredColor: string
      life: number
      isLogo: boolean
      isText: boolean
    }[] = []

    let textImageData: ImageData | null = null

    function createTextImage() {
      if (!ctx || !canvas) return 0

      ctx.fillStyle = "white"
      ctx.save()

      // Calculate responsive dimensions for the logo
      let logoHeight: number
      if (isMobile) {
        logoHeight = Math.min(150, canvas.height * 0.3) // Smaller on mobile, max 150px
      } else if (isTablet) {
        logoHeight = Math.min(250, canvas.height * 0.4) // Medium on tablet, max 250px
      } else {
        logoHeight = Math.min(350, canvas.height * 0.5) // Larger on desktop, max 350px
      }
      const logoWidth = logoHeight * (1730 / 470) // Maintain aspect ratio based on SVG viewBox

      // Center the logo
      ctx.translate(canvas.width / 2 - logoWidth / 2, canvas.height / 2 - logoHeight / 2)

      // Scale to match desired size
      const scale = logoHeight / 470
      ctx.scale(scale, scale)

      // Draw logo shape parts
      NAPCART_LOGO_PATH.logoShape.forEach((path, index) => {
        ctx.beginPath()
        const pathObj = new Path2D(path)
        ctx.fillStyle = index === 0 || index === 3 ? "#737373" : "#000000"
        ctx.fill(pathObj)
      })

      // Draw text parts
      ctx.fillStyle = "#000000"
      NAPCART_LOGO_PATH.textPaths.forEach((path) => {
        ctx.beginPath()
        const pathObj = new Path2D(path)
        ctx.fill(pathObj)
      })

      ctx.restore()

      textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.clearRect(0, 0, canvas.width, canvas.width)

      return scale
    }

    function createParticle(scale: number) {
      if (!ctx || !canvas || !textImageData) return null

      const data = textImageData.data
      const particleGap = 2

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * canvas.width)
        const y = Math.floor(Math.random() * canvas.height)

        if (data[(y * canvas.width + x) * 4 + 3] > 128) {
          // Determine if the particle is part of the logo shape or text
          const centerX = canvas.width / 2
          const centerY = canvas.height / 2
          
          // Use same responsive sizing as in createTextImage
          let logoHeight: number
          if (isMobile) {
            logoHeight = Math.min(150, canvas.height * 0.3)
          } else if (isTablet) {
            logoHeight = Math.min(250, canvas.height * 0.4)
          } else {
            logoHeight = Math.min(350, canvas.height * 0.5)
          }
          const logoWidth = logoHeight * (1730 / 470)

          // Check if pixel is in the left part (logo) or right part (text)
          const isLogo = x < centerX - logoWidth * 0.2 // Approximate division between logo and text

          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: Math.random() * 1.5 + 0.5,
            color: "white",
            scatteredColor: isLogo ? "#737373" : "#FFFFFF", // Gray for logo, White for text
            isLogo: isLogo,
            isText: !isLogo,
            life: Math.random() * 100 + 50,
          }
        }
      }

      return null
    }

    function createInitialParticles(scale: number) {
      // Responsive particle count based on device type
      let baseParticleCount: number
      if (isMobile) {
        baseParticleCount = 3000 // Reduced for mobile performance
      } else if (isTablet) {
        baseParticleCount = 5000 // Medium for tablet
      } else {
        baseParticleCount = 7000 // Full count for desktop
      }
      
      if (!canvas) return;
      const particleCount = Math.floor(baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)))
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle(scale)
        if (particle) particles.push(particle)
      }
    }

    let animationFrameId: number

    function animate(scale: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "black"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { x: mouseX, y: mouseY } = mousePositionRef.current
      // Responsive interaction distance based on device type
      const maxDistance = isMobile ? 180 : isTablet ? 210 : 240

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance && (isTouchingRef.current || !("ontouchstart" in window))) {
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          // Responsive movement force
          const moveForce = isMobile ? 40 : isTablet ? 50 : 60
          const moveX = Math.cos(angle) * force * moveForce
          const moveY = Math.sin(angle) * force * moveForce
          p.x = p.baseX - moveX
          p.y = p.baseY - moveY

          ctx.fillStyle = p.scatteredColor
        } else {
          // Responsive return speed
          const returnSpeed = isMobile ? 0.15 : 0.1
          p.x += (p.baseX - p.x) * returnSpeed
          p.y += (p.baseY - p.y) * returnSpeed
          ctx.fillStyle = "white"
        }

        ctx.fillRect(p.x, p.y, p.size, p.size)

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle(scale)
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      // Use same responsive particle count logic
      let baseParticleCount: number
      if (isMobile) {
        baseParticleCount = 3000
      } else if (isTablet) {
        baseParticleCount = 5000
      } else {
        baseParticleCount = 7000
      }
      
      const targetParticleCount = Math.floor(
        baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)),
      )
      while (particles.length < targetParticleCount) {
        const newParticle = createParticle(scale)
        if (newParticle) particles.push(newParticle)
      }

      animationFrameId = requestAnimationFrame(() => animate(scale))
    }

    const scale = createTextImage()
    createInitialParticles(scale)
    animate(scale)

    const handleResize = () => {
      updateCanvasSize()
      const newScale = createTextImage()
      particles = []
      createInitialParticles(newScale)
    }

    const handleMove = (x: number, y: number) => {
      mousePositionRef.current = { x, y }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      mousePositionRef.current = { x: 0, y: 0 }
    }

    const handleMouseLeave = () => {
      if (!("ontouchstart" in window)) {
        mousePositionRef.current = { x: 0, y: 0 }
      }
    }

    window.addEventListener("resize", handleResize)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("mouseleave", handleMouseLeave)
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("resize", handleResize)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isMobile, isTablet])

  return (
    <div className="relative w-full h-dvh flex flex-col items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute top-0 left-0 touch-none"
        aria-label="Interactive particle effect with NapCart logo"
      />
      <div className="absolute bottom-8 sm:bottom-16 md:bottom-20 lg:bottom-24 text-center z-10 px-4">
        <p className="font-mono text-gray-400 text-xs sm:text-sm md:text-base lg:text-lg">
          {/* <a
            href="https://www.napcart.com"
            target="_blank"
            className="invite-link text-gray-300 hover:text-gray-100 transition-colors duration-300"
            rel="noreferrer"
          >
            Visit NapCart
          </a> 
          <br /> */}
          <a
            href="https://www.napcart.com"
            target="_blank"
            className="invite-link text-gray-300 hover:text-gray-100 transition-colors duration-300"
            rel="noreferrer"
          >
            We Are Comming Soon!
          </a>
          <style>{`
            a.invite-link:hover {
              color: #737373;
            }
          `}</style>
        </p>
      </div>
    </div>
  )
}

