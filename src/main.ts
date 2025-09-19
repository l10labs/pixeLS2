import './style.css'
import { Application, Container, Graphics } from './lib/simple-pixi'

type Phase = 'travel' | 'battle' | 'enemy-turn' | 'gameover'

interface Enemy {
  level: number
  title: string
  maxHealth: number
  health: number
  attack: number
}

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min

const enemyTitles = ['Scout', 'Marauder', 'Sentinel', 'Phantom', 'Warden']
const enemyLabel = (enemy: Enemy) => `Level ${enemy.level} ${enemy.title}`

const TRAVEL_SPEED = 170
const SEGMENT_COUNT = 6
const SEGMENT_HEIGHT = 220
const SEGMENT_SPACING = 180

const app = new Application()

const mount = document.querySelector<HTMLDivElement>('#app')
if (!mount) {
  throw new Error('Root container "#app" was not found')
}

await app.init({ background: '#020617', resizeTo: window })
mount.appendChild(app.canvas)

const world = new Container()
app.stage.addChild(world)

const pathContainer = new Container()
world.addChild(pathContainer)

const segments: Graphics[] = Array.from({ length: SEGMENT_COUNT }, () => {
  const segment = new Graphics()
  pathContainer.addChild(segment)
  return segment
})

const playerGraphic = new Graphics()
world.addChild(playerGraphic)

const enemyGraphic = new Graphics()
enemyGraphic.visible = false
world.addChild(enemyGraphic)

let currentEnemyLevelForScene = 1

const resetSegments = () => {
  const start = -SEGMENT_SPACING * 2
  segments.forEach((segment, index) => {
    segment.y = start + index * SEGMENT_SPACING
  })
}

const drawPathSegment = (segment: Graphics, baseWidth: number) => {
  const topWidth = baseWidth * 0.55
  const bottomWidth = baseWidth
  const centerLineBottom = bottomWidth * 0.14
  const centerLineTop = topWidth * 0.14

  segment.clear()
  segment.beginFill(0x111827)
  segment.drawPolygon([
    -bottomWidth / 2,
    SEGMENT_HEIGHT / 2,
    bottomWidth / 2,
    SEGMENT_HEIGHT / 2,
    topWidth / 2,
    -SEGMENT_HEIGHT / 2,
    -topWidth / 2,
    -SEGMENT_HEIGHT / 2
  ])
  segment.endFill()

  segment.beginFill(0x1f2937)
  segment.drawPolygon([
    -bottomWidth / 2,
    SEGMENT_HEIGHT / 2,
    -bottomWidth * 0.7,
    SEGMENT_HEIGHT / 2,
    -topWidth * 0.65,
    -SEGMENT_HEIGHT / 2,
    -topWidth / 2,
    -SEGMENT_HEIGHT / 2
  ])
  segment.endFill()

  segment.beginFill(0x1f2937)
  segment.drawPolygon([
    bottomWidth / 2,
    SEGMENT_HEIGHT / 2,
    bottomWidth * 0.7,
    SEGMENT_HEIGHT / 2,
    topWidth * 0.65,
    -SEGMENT_HEIGHT / 2,
    topWidth / 2,
    -SEGMENT_HEIGHT / 2
  ])
  segment.endFill()

  segment.beginFill(0x93c5fd, 0.32)
  segment.drawPolygon([
    -centerLineBottom / 2,
    SEGMENT_HEIGHT / 2,
    centerLineBottom / 2,
    SEGMENT_HEIGHT / 2,
    centerLineTop / 2,
    -SEGMENT_HEIGHT / 2,
    -centerLineTop / 2,
    -SEGMENT_HEIGHT / 2
  ])
  segment.endFill()
}

const drawPlayer = (baseSize: number) => {
  const height = Math.max(60, baseSize * 0.9)
  const shoulderWidth = height * 0.55
  const torsoHeight = height * 0.85

  playerGraphic.clear()
  playerGraphic.beginFill(0x0ea5e9)
  playerGraphic.drawPolygon([
    0,
    -torsoHeight,
    shoulderWidth * 0.45,
    -torsoHeight * 0.25,
    shoulderWidth * 0.32,
    torsoHeight * 0.45,
    -shoulderWidth * 0.32,
    torsoHeight * 0.45,
    -shoulderWidth * 0.45,
    -torsoHeight * 0.25
  ])
  playerGraphic.endFill()

  playerGraphic.beginFill(0x38bdf8)
  playerGraphic.drawPolygon([
    0,
    -torsoHeight * 1.05,
    height * 0.14,
    -torsoHeight * 0.45,
    0,
    -torsoHeight * 0.35,
    -height * 0.14,
    -torsoHeight * 0.45
  ])
  playerGraphic.endFill()

  playerGraphic.beginFill(0xf8fafc)
  playerGraphic.drawCircle(0, -torsoHeight * 0.95, height * 0.18)
  playerGraphic.endFill()

  playerGraphic.beginFill(0x22d3ee)
  playerGraphic.drawPolygon([
    height * 0.2,
    torsoHeight * 0.2,
    height * 0.4,
    -torsoHeight * 0.15,
    height * 0.24,
    -torsoHeight * 0.2,
    height * 0.1,
    torsoHeight * 0.1
  ])
  playerGraphic.endFill()
}

const drawEnemy = (level: number, baseSize: number) => {
  const height = Math.max(70, baseSize * (0.9 + level * 0.08))
  const shoulderWidth = height * 0.6

  enemyGraphic.clear()
  enemyGraphic.beginFill(0x991b1b)
  enemyGraphic.drawPolygon([
    0,
    -height,
    shoulderWidth * 0.55,
    -height * 0.25,
    shoulderWidth * 0.35,
    height * 0.9,
    0,
    height * 0.55,
    -shoulderWidth * 0.35,
    height * 0.9,
    -shoulderWidth * 0.55,
    -height * 0.25
  ])
  enemyGraphic.endFill()

  enemyGraphic.beginFill(0xef4444)
  enemyGraphic.drawPolygon([
    0,
    -height * 0.85,
    shoulderWidth * 0.38,
    -height * 0.15,
    0,
    -height * 0.05,
    -shoulderWidth * 0.38,
    -height * 0.15
  ])
  enemyGraphic.endFill()

  enemyGraphic.beginFill(0xfca5a5)
  enemyGraphic.drawCircle(0, -height * 0.65, height * 0.24)
  enemyGraphic.endFill()

  enemyGraphic.beginFill(0xfee2e2)
  enemyGraphic.drawCircle(-height * 0.09, -height * 0.65, height * 0.07)
  enemyGraphic.drawCircle(height * 0.09, -height * 0.65, height * 0.07)
  enemyGraphic.endFill()

  enemyGraphic.beginFill(0x7f1d1d)
  enemyGraphic.drawPolygon([
    -shoulderWidth * 0.45,
    -height * 0.4,
    -shoulderWidth * 0.2,
    -height * 0.7,
    0,
    -height * 0.55,
    shoulderWidth * 0.2,
    -height * 0.7,
    shoulderWidth * 0.45,
    -height * 0.4,
    0,
    -height * 0.3
  ])
  enemyGraphic.endFill()
}

let playerBaseY = 0
let enemyBaseY = 0

const layoutScene = () => {
  const baseWidth = Math.min(app.canvas.width * 0.45, 360)
  pathContainer.x = app.canvas.width / 2

  segments.forEach((segment) => {
    const previousY = segment.y
    drawPathSegment(segment, baseWidth)
    segment.y = previousY
  })

  const baseSize = Math.min(app.canvas.width, app.canvas.height)
  playerBaseY = app.canvas.height * 0.75
  enemyBaseY = app.canvas.height * 0.32

  playerGraphic.x = app.canvas.width / 2
  playerGraphic.y = playerBaseY
  drawPlayer(baseSize * 0.08)

  enemyGraphic.x = app.canvas.width / 2
  enemyGraphic.y = enemyBaseY
  drawEnemy(currentEnemyLevelForScene, baseSize * 0.08)
}

resetSegments()
layoutScene()

let resizeTimeout: number | undefined
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimeout)
  resizeTimeout = window.setTimeout(() => {
    layoutScene()
  }, 120)
})

const hud = document.createElement('div')
hud.className = 'hud'
hud.innerHTML = `
  <div class="hud-card">
    <div class="hud-title">Traveler</div>
    <div class="hud-metric"><span class="hud-label">Health</span><span class="hud-value" data-id="player-health">100</span></div>
    <div class="hud-metric"><span class="hud-label">Attack</span><span class="hud-value">10</span></div>
    <div class="hud-metric"><span class="hud-label">Kills</span><span class="hud-value" data-id="player-kills">0</span></div>
  </div>
  <div class="hud-card">
    <div class="hud-title">Encounter</div>
    <div class="hud-metric"><span class="hud-label">Enemy</span><span class="hud-value" data-id="enemy-name">—</span></div>
    <div class="hud-metric"><span class="hud-label">Health</span><span class="hud-value" data-id="enemy-health">—</span></div>
    <div class="hud-metric"><span class="hud-label">Attack</span><span class="hud-value" data-id="enemy-attack">—</span></div>
  </div>
`
mount.appendChild(hud)

const playerHealthEl = hud.querySelector('[data-id="player-health"]') as HTMLSpanElement
const playerKillsEl = hud.querySelector('[data-id="player-kills"]') as HTMLSpanElement
const enemyNameEl = hud.querySelector('[data-id="enemy-name"]') as HTMLSpanElement
const enemyHealthEl = hud.querySelector('[data-id="enemy-health"]') as HTMLSpanElement
const enemyAttackEl = hud.querySelector('[data-id="enemy-attack"]') as HTMLSpanElement

const travelProgress = document.createElement('div')
travelProgress.className = 'travel-progress'
travelProgress.innerHTML = `
  <div class="travel-progress__label">Northbound distance</div>
  <div class="travel-progress__track"><div class="travel-progress__fill" data-id="progress-fill"></div></div>
`
mount.appendChild(travelProgress)

const progressFillEl = travelProgress.querySelector('[data-id="progress-fill"]') as HTMLDivElement

const statusEl = document.createElement('div')
statusEl.className = 'status'
mount.appendChild(statusEl)

const controls = document.createElement('div')
controls.className = 'controls'

const attackButton = document.createElement('button')
attackButton.className = 'attack-button'
attackButton.type = 'button'
attackButton.textContent = 'Attack'
attackButton.disabled = true

controls.appendChild(attackButton)
mount.appendChild(controls)

const endScreen = document.createElement('div')
endScreen.className = 'end-screen'
endScreen.innerHTML = `
  <div class="end-screen__card">
    <h2>Journey Ends</h2>
    <p>You defeated <strong><span data-id="final-kills">0</span></strong> enemies.</p>
    <button type="button" class="restart-button">Restart</button>
  </div>
`
mount.appendChild(endScreen)

const finalKillsEl = endScreen.querySelector('[data-id="final-kills"]') as HTMLSpanElement
const restartButton = endScreen.querySelector('.restart-button') as HTMLButtonElement

const setStatus = (message: string) => {
  statusEl.textContent = message
}

const timeouts: number[] = []
const scheduleTimeout = (callback: () => void, delay: number) => {
  const id = window.setTimeout(() => {
    const index = timeouts.indexOf(id)
    if (index >= 0) {
      timeouts.splice(index, 1)
    }
    callback()
  }, delay)
  timeouts.push(id)
  return id
}

const clearScheduled = () => {
  while (timeouts.length) {
    const id = timeouts.pop()
    if (id !== undefined) {
      window.clearTimeout(id)
    }
  }
}

const randomTravelTarget = () => randomRange(700, 1300)

const game = {
  phase: 'travel' as Phase,
  playerHealth: 100,
  playerDamage: 10,
  kills: 0,
  travelProgress: 0,
  travelTarget: randomTravelTarget(),
  currentEnemy: null as Enemy | null
}

const updateHud = () => {
  playerHealthEl.textContent = Math.max(0, Math.floor(game.playerHealth)).toString()
  playerKillsEl.textContent = game.kills.toString()

  if (game.currentEnemy) {
    enemyNameEl.textContent = enemyLabel(game.currentEnemy)
    enemyHealthEl.textContent = `${Math.max(0, Math.floor(game.currentEnemy.health))}/${game.currentEnemy.maxHealth}`
    enemyAttackEl.textContent = game.currentEnemy.attack.toString()
  } else {
    enemyNameEl.textContent = '—'
    enemyHealthEl.textContent = '—'
    enemyAttackEl.textContent = '—'
  }
}

const updateProgressBar = () => {
  const ratio = game.phase === 'travel' ? Math.min(game.travelProgress / game.travelTarget, 1) : 0
  progressFillEl.style.width = `${Math.floor(ratio * 100)}%`
}

const hideEndScreen = () => {
  endScreen.classList.remove('end-screen--visible')
}

const showEndScreen = () => {
  finalKillsEl.textContent = game.kills.toString()
  endScreen.classList.add('end-screen--visible')
}

const beginTravel = () => {
  clearScheduled()
  game.phase = 'travel'
  game.travelProgress = 0
  game.travelTarget = randomTravelTarget()
  game.currentEnemy = null
  enemyGraphic.visible = false
  currentEnemyLevelForScene = 1
  attackButton.disabled = true
  setStatus('Traveling north...')
  updateHud()
  updateProgressBar()
}

const beginEncounter = () => {
  if (game.phase !== 'travel') return

  clearScheduled()
  const level = game.kills + 1
  const title = enemyTitles[(level - 1) % enemyTitles.length]
  const maxHealth = level * 10
  const attack = level
  const enemy: Enemy = {
    level,
    title,
    maxHealth,
    health: maxHealth,
    attack
  }
  game.currentEnemy = enemy
  game.phase = 'battle'
  attackButton.disabled = false
  enemyGraphic.visible = true
  currentEnemyLevelForScene = enemy.level

  const baseSize = Math.min(app.canvas.width, app.canvas.height)
  drawEnemy(enemy.level, baseSize * 0.08)

  setStatus(`${enemyLabel(enemy)} blocks your path!`)
  updateHud()
  updateProgressBar()
}

const finishJourney = () => {
  clearScheduled()
  game.phase = 'gameover'
  attackButton.disabled = true
  enemyGraphic.visible = false
  currentEnemyLevelForScene = 1
  setStatus('Your journey north has ended.')
  updateHud()
  updateProgressBar()
  showEndScreen()
}

const handleEnemyDefeat = () => {
  if (!game.currentEnemy) return

  game.kills += 1
  setStatus(`You defeat ${enemyLabel(game.currentEnemy)}!`)
  game.currentEnemy = null
  enemyGraphic.visible = false
  currentEnemyLevelForScene = 1
  attackButton.disabled = true
  updateHud()
  updateProgressBar()

  scheduleTimeout(() => {
    beginTravel()
  }, 800)
}

const handlePlayerAttack = () => {
  if (game.phase !== 'battle' || !game.currentEnemy) {
    return
  }

  const enemy = game.currentEnemy
  enemy.health = Math.max(0, enemy.health - game.playerDamage)
  updateHud()
  setStatus(`You strike ${enemyLabel(enemy)} for ${game.playerDamage} damage!`)

  if (enemy.health <= 0) {
    handleEnemyDefeat()
    return
  }

  game.phase = 'enemy-turn'
  attackButton.disabled = true

  scheduleTimeout(() => {
    if (!game.currentEnemy) return
    const currentEnemy = game.currentEnemy
    const damage = currentEnemy.attack
    game.playerHealth = Math.max(0, game.playerHealth - damage)
    updateHud()

    if (game.playerHealth <= 0) {
      setStatus(`${enemyLabel(currentEnemy)} strikes the final blow.`)
      finishJourney()
      return
    }

    setStatus(`${enemyLabel(currentEnemy)} hits you for ${damage} damage. Your move!`)
    game.phase = 'battle'
    attackButton.disabled = false
  }, 700)
}

attackButton.addEventListener('click', handlePlayerAttack)

const restartGame = () => {
  clearScheduled()
  game.playerHealth = 100
  game.kills = 0
  resetSegments()
  currentEnemyLevelForScene = 1
  hideEndScreen()
  beginTravel()
}

restartButton.addEventListener('click', restartGame)

beginTravel()

let lastTime = performance.now()
let bobTimer = 0

const totalLoopDistance = SEGMENT_SPACING * SEGMENT_COUNT

const tick = (time: number) => {
  const delta = Math.min((time - lastTime) / 1000, 0.12)
  lastTime = time
  bobTimer += delta

  const speed = game.phase === 'travel' ? TRAVEL_SPEED : 0

  segments.forEach((segment) => {
    segment.y += speed * delta
    if (segment.y - SEGMENT_HEIGHT / 2 > app.canvas.height) {
      segment.y -= totalLoopDistance
    }
  })

  if (game.phase === 'travel') {
    game.travelProgress = Math.min(game.travelProgress + speed * delta, game.travelTarget)
    if (game.travelProgress >= game.travelTarget) {
      beginEncounter()
    }
  }

  updateProgressBar()

  playerGraphic.y = playerBaseY + Math.sin(bobTimer * 2.4) * 6
  enemyGraphic.y = (game.currentEnemy ? enemyBaseY + Math.sin(bobTimer * 1.8) * 4 : enemyBaseY)

  requestAnimationFrame(tick)
}

requestAnimationFrame((time) => {
  lastTime = time
  tick(time)
})
