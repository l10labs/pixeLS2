import './style.css'
import { Application, Container, Graphics } from './lib/simple-pixi'
import { gsap } from './lib/simple-gsap'

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min

const app = new Application()

const mount = document.querySelector<HTMLDivElement>('#app')
if (!mount) {
  throw new Error('Root container "#app" was not found')
}

await app.init({ background: '#020617', resizeTo: window })
mount.appendChild(app.canvas)

const forest = new Container()
app.stage.addChild(forest)

const circle = new Graphics()
circle.beginFill(0x38bdf8)
circle.drawCircle(0, 0, 24)
circle.endFill()
app.stage.addChild(circle)

let circleTween: ReturnType<typeof gsap.to> | null = null
const treeTweens: Array<ReturnType<typeof gsap.to>> = []
let forestDepth = 0

const clearContainer = (container: Container) => {
  while (container.children.length) {
    container.removeChild(container.children[0])
  }
}

const buildForest = () => {
  treeTweens.splice(0).forEach((tween) => tween.kill?.())
  clearContainer(forest)

  const width = app.canvas.width
  const height = app.canvas.height
  const layers = 3
  const treesPerLayer = 28
  const palette = ['#0f172a', '#1e293b', '#334155']
  forestDepth = height * 2.5

  for (let layer = 0; layer < layers; layer += 1) {
    const depthFactor = 1 - layer / layers
    const layerAlpha = 0.25 + depthFactor * 0.45
    const baseSize = 60 + layer * 25
    const spacing = forestDepth / treesPerLayer

    for (let i = 0; i < treesPerLayer; i += 1) {
      const tree = new Graphics()
      const size = randomRange(baseSize * 0.6, baseSize * 1.3)
      tree.beginFill(palette[layer % palette.length])
      tree.drawPolygon([
        -size / 2,
        0,
        0,
        -size,
        size / 2,
        0
      ])
      tree.endFill()
      tree.alpha = layerAlpha
      tree.x = randomRange(-size, width + size)
      const jitter = randomRange(-spacing * 0.3, spacing * 0.3)
      tree.y = height - i * spacing - layer * (spacing / 3) + jitter
      forest.addChild(tree)

      const floatDistance = randomRange(6, 18) * depthFactor
      const duration = randomRange(3.2, 6.4) + layer
      const tween = gsap.to(tree, {
        y: tree.y - floatDistance,
        duration,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: randomRange(0, 2.5)
      })
      treeTweens.push(tween)
    }
  }
}

const animateCircle = () => {
  circleTween?.kill?.()
  const width = app.canvas.width
  const height = app.canvas.height

  circle.x = width / 2
  circle.y = height + 60

  circleTween = gsap.to(circle, {
    y: -forestDepth,
    duration: 12,
    ease: 'power2.inOut',
    repeat: -1,
    onRepeat: () => {
      circle.x = width / 2 + randomRange(-width * 0.15, width * 0.15)
    }
  })
}

const rebuildScene = () => {
  buildForest()
  animateCircle()
}

rebuildScene()

let resizeTimeout: number | undefined
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimeout)
  resizeTimeout = window.setTimeout(() => {
    rebuildScene()
  }, 150)
})

const label = document.createElement('div')
label.className = 'scene-label'
label.innerHTML = `
  <strong>PixiJS</strong> + <strong>GSAP</strong><br />
  Circle gliding through a triangle forest
`
mount.appendChild(label)
