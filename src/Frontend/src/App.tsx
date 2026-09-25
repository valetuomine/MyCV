import Grainient from './components/Grainient'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <Grainient
        className="app-background"
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
        color1="#22B8A7"
        color2="#1B496F"
        color3="#07111D"
      />
      <section className="app-content">
        <p className="eyebrow">MyCV</p>
        <h1>Professional profile, thoughtfully presented.</h1>
        <p className="intro">
          The frontend foundation is ready for the CV experience.
        </p>
      </section>
    </main>
  )
}

export default App
