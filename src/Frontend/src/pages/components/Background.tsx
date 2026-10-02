import { useState, type JSX, type ReactNode } from "react"
import Grainient from "./Grainient"

const cssColor = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
  fallback

interface BackgroundProps {
  children: ReactNode
}

export default function Background({ children }: BackgroundProps): JSX.Element {
  const [palette] = useState(() => ({
    color1: cssColor("--color-cv-teal", "#22b8a7"),
    color2: cssColor("--color-cv-blue", "#1b5f7a"),
    color3: cssColor("--color-cv-deep", "#176474"),
  }))

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-cv-deep text-cv-paper">
      <Grainient
        className="pointer-events-none !fixed inset-0 z-0"
        timeSpeed={0.5}
        colorBalance={-0.14}
        warpStrength={0.68}
        warpFrequency={4.6}
        warpSpeed={0.28}
        warpAmplitude={42}
        blendAngle={63}
        blendSoftness={0.48}
        rotationAmount={160}
        noiseScale={2.05}
        grainAmount={0.01}
        grainScale={2}
        grainAnimated={false}
        contrast={1.24}
        gamma={0.98}
        saturation={0.76}
        centerX={-0.55}
        centerY={0.12}
        zoom={1.7}
        color1={palette.color1}
        color2={palette.color2}
        color3={palette.color3}
      />
      <div className="relative z-10 grid min-h-screen grid-rows-[auto_1fr_auto] px-[clamp(1.5rem,5vw,5.5rem)] pt-10 pb-8 max-sm:px-5 max-sm:py-6">
        {children}
      </div>
    </main>
  )
}
