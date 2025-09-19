import './style.css'
import { Application, Container, Graphics, Sprite } from './lib/simple-pixi'
import { gsap } from './lib/simple-gsap'
import type { TweenInstance } from './lib/simple-gsap'

const SPRITE_SIZE = 16
const SPRITE_COUNT = 15

type GamePhase = 'menu' | 'select' | 'travel' | 'battle' | 'end'

type SpriteAssets = { image: HTMLImageElement; url: string }

interface PlayerState {
  health: number
  attack: number
  spriteIndex: number
  name: string
}

interface EnemyState {
  health: number
  maxHealth: number
  attack: number
  index: number
  name: string
}

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const canvasToImage = async (canvas: HTMLCanvasElement): Promise<SpriteAssets> => {
  const url = canvas.toDataURL()
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to load generated sprite sheet'))
    image.src = url
  })
  return { image, url }
}

const createMonsterSheet = async (): Promise<SpriteAssets> => {
  const canvas = createCanvas(SPRITE_SIZE * SPRITE_COUNT, SPRITE_SIZE)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to create monster sprite sheet context')
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < SPRITE_COUNT; i += 1) {
    const x = i * SPRITE_SIZE
    const hue = (i * 23) % 360
    const base = SPRITE_SIZE

    ctx.save()
    ctx.translate(x, 0)

    ctx.fillStyle = `hsl(${hue}, 74%, 58%)`
    ctx.beginPath()
    ctx.moveTo(2, base - 3)
    ctx.quadraticCurveTo(base / 2, base - 1, base - 2, base - 3)
    ctx.lineTo(base - 2, 5)
    ctx.quadraticCurveTo(base / 2, 1.5, 2, 5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = `hsl(${(hue + 180) % 360}, 70%, 35%)`
    ctx.beginPath()
    ctx.moveTo(base / 2, 1)
    ctx.lineTo(base / 2 - 3, 5)
    ctx.lineTo(base / 2 + 3, 5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'
    ctx.beginPath()
    ctx.moveTo(3, base - 3)
    ctx.lineTo(6, base - 1)
    ctx.lineTo(base - 6, base - 1)
    ctx.lineTo(base - 3, base - 3)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.arc(base / 2 - 2, base / 2, 2.5, 0, Math.PI * 2)
    ctx.arc(base / 2 + 2, base / 2, 2.5, 0, Math.PI * 2)
    ctx.fill('evenodd')

    ctx.fillStyle = '#020617'
    ctx.beginPath()
    ctx.arc(base / 2 - 2, base / 2, 1.3, 0, Math.PI * 2)
    ctx.arc(base / 2 + 2, base / 2, 1.3, 0, Math.PI * 2)
    ctx.fill('evenodd')

    ctx.fillStyle = `hsl(${(hue + 60) % 360}, 80%, 65%)`
    ctx.beginPath()
    ctx.moveTo(5, 6)
    ctx.lineTo(base / 2, 0)
    ctx.lineTo(base - 5, 6)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(base / 2 - 4, base - 6, 8, 3)

    ctx.restore()
  }

  return canvasToImage(canvas)
}

const createHeroSheet = async (): Promise<SpriteAssets> => {
  const canvas = createCanvas(SPRITE_SIZE * SPRITE_COUNT, SPRITE_SIZE)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to create hero sprite sheet context')
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < SPRITE_COUNT; i += 1) {
    const x = i * SPRITE_SIZE
    const hue = (i * 19) % 360
    const base = SPRITE_SIZE

    ctx.save()
    ctx.translate(x, 0)

    ctx.fillStyle = `hsl(${hue}, 62%, 54%)`
    ctx.fillRect(6, 8, 4, 6)

    ctx.fillStyle = `hsl(${(hue + 120) % 360}, 52%, 45%)`
    ctx.fillRect(5, 4, 6, 6)

    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(6, 3, 4, 3)

    ctx.fillStyle = '#1e293b'
    ctx.fillRect(7, 4, 2, 2)

    ctx.fillStyle = `hsl(${(hue + 210) % 360}, 50%, 45%)`
    ctx.beginPath()
    ctx.moveTo(2, 14)
    ctx.lineTo(6, 9)
    ctx.lineTo(6, 14)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(base - 2, 14)
    ctx.lineTo(base - 6, 9)
    ctx.lineTo(base - 6, 14)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = `hsl(${(hue + 30) % 360}, 68%, 55%)`
    ctx.fillRect(6, 0, 4, 3)

    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(4, 9, 2, 2)
    ctx.fillRect(base - 6, 9, 2, 2)

    ctx.fillStyle = `rgba(14, 116, 144, ${0.35 + (i % 3) * 0.2})`
    ctx.fillRect(7, 10, 2, 5)

    ctx.restore()
  }

  return canvasToImage(canvas)
}

const enemyNames = [
  'Glimmerling',
  'Ashlurker',
  'Frost Gaze',
  'Hollowscreech',
  'Moon Maw',
  'Iron Bloom',
  'Twilight Fang',
  'Duskwalker',
  'Spindle Maw',
  'Night Mote',
  'Void Sprout',
  'Thorn Gleam',
  'Lantern Gnash',
  'Bile Bloom',
  'Star Husk'
]

const heroNames = [
  'Ember Scout',
  'Storm Scribe',
  'Shadelock',
  'Sky Warden',
  'Runeblade',
  'Grove Caller',
  'Soul Archer',
  'Frost Whisper',
  'Void Hunter',
  'Dusk Rider',
  'Ironbound',
  'Star Dancer',
  'Night Herald',
  'Glimmer Knight',
  'Aurora Sage'
]

const mount = document.querySelector<HTMLDivElement>('#app')
if (!mount) {
  throw new Error('Root container "#app" was not found')
}

const app = new Application()
await app.init({ background: '#010b16', resizeTo: window })
mount.appendChild(app.canvas)

const [monsterSheet, heroSheet] = await Promise.all([createMonsterSheet(), createHeroSheet()])

const world = new Container()
app.stage.addChild(world)

const backdrop = new Graphics()
const trail = new Graphics()
const trailGlow = new Graphics()
const stripeLayer = new Container()

world.addChild(backdrop)
world.addChild(trail)
world.addChild(trailGlow)
world.addChild(stripeLayer)

const heroSprite = new Sprite(heroSheet.image)
heroSprite.setFrame(0, 0, SPRITE_SIZE, SPRITE_SIZE)
heroSprite.setAnchor(0.5, 1)
heroSprite.alpha = 0
world.addChild(heroSprite)

const enemySprite = new Sprite(monsterSheet.image)
enemySprite.setFrame(0, 0, SPRITE_SIZE, SPRITE_SIZE)
enemySprite.setAnchor(0.5, 1)
enemySprite.alpha = 0
world.addChild(enemySprite)

const heroBasePosition = { x: 0, y: 0 }
const enemyBasePosition = { x: 0, y: 0 }

let heroIdleTween: TweenInstance | null = null
let enemyIdleTween: TweenInstance | null = null
const travelTweens: TweenInstance[] = []

const stripes: Graphics[] = []
let stripeLength = 0
let stripeGap = 0

const clearContainer = (container: Container) => {
  while (container.children.length) {
    container.removeChild(container.children[0])
  }
}

const rebuildStripes = (width: number, height: number, pathWidth: number) => {
  travelTweens.splice(0).forEach((tween) => tween.kill?.())
  stripes.splice(0, stripes.length)
  clearContainer(stripeLayer)

  const stripeCount = 6
  stripeLength = Math.min(height * 0.25, 220)
  stripeGap = stripeLength * 0.65

  for (let i = 0; i < stripeCount; i += 1) {
    const stripe = new Graphics()
    const topWidth = pathWidth * 0.08
    const bottomWidth = pathWidth * 0.22
    stripe.beginFill('rgba(148, 163, 184, 0.45)')
    stripe.drawPolygon([
      -topWidth / 2,
      0,
      topWidth / 2,
      0,
      bottomWidth / 2,
      stripeLength,
      -bottomWidth / 2,
      stripeLength
    ])
    stripe.endFill()
    stripe.x = width / 2
    stripe.y = height - i * (stripeLength + stripeGap) - 80
    stripeLayer.addChild(stripe)
    stripes.push(stripe)
  }
}

const startTravelAnimation = () => {
  travelTweens.splice(0).forEach((tween) => tween.kill?.())
  if (!stripes.length) return

  stripes.forEach((stripe, index) => {
    const duration = 2 + index * 0.15
    stripe.y = app.canvas.height - index * (stripeLength + stripeGap) - 80
    const tween = gsap.to(stripe, {
      y: -stripeLength,
      duration,
      ease: 'linear',
      repeat: -1,
      onRepeat: () => {
        stripe.y = app.canvas.height + stripeGap
      }
    })
    travelTweens.push(tween)
  })
}

const stopTravelAnimation = () => {
  travelTweens.splice(0).forEach((tween) => tween.kill?.())
}

const startHeroIdle = () => {
  heroIdleTween?.kill?.()
  heroSprite.y = heroBasePosition.y
  heroIdleTween = gsap.to(heroSprite, {
    y: heroBasePosition.y - 12,
    duration: 1.4,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  })
}

const stopHeroIdle = () => {
  heroIdleTween?.kill?.()
  heroIdleTween = null
  heroSprite.y = heroBasePosition.y
}

const startEnemyIdle = () => {
  enemyIdleTween?.kill?.()
  enemySprite.y = enemyBasePosition.y
  enemyIdleTween = gsap.to(enemySprite, {
    y: enemyBasePosition.y - 10,
    duration: 1.6,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  })
}

const stopEnemyIdle = () => {
  enemyIdleTween?.kill?.()
  enemyIdleTween = null
  enemySprite.y = enemyBasePosition.y
}

const layoutScene = () => {
  const width = app.canvas.width
  const height = app.canvas.height
  const pathWidth = Math.min(width * 0.55, 520)
  const shoulder = pathWidth * 0.35

  backdrop.clear()
  backdrop.beginFill('#010b16')
  backdrop.drawPolygon([0, 0, width, 0, width, height, 0, height])
  backdrop.endFill()

  trail.clear()
  trail.beginFill('#061626')
  trail.drawPolygon([
    width / 2 - pathWidth / 2,
    height,
    width / 2 + pathWidth / 2,
    height,
    width / 2 + shoulder,
    0,
    width / 2 - shoulder,
    0
  ])
  trail.endFill()

  trailGlow.clear()
  trailGlow.beginFill('rgba(56, 189, 248, 0.12)')
  trailGlow.drawPolygon([
    width / 2 - pathWidth * 0.18,
    height,
    width / 2 + pathWidth * 0.18,
    height,
    width / 2 + shoulder * 0.45,
    0,
    width / 2 - shoulder * 0.45,
    0
  ])
  trailGlow.endFill()

  rebuildStripes(width, height, pathWidth)

  const spriteScale = Math.max(4, Math.min(6.2, pathWidth / 110))

  heroBasePosition.x = width / 2 - pathWidth * 0.18
  heroBasePosition.y = height - Math.min(220, pathWidth * 0.35)
  heroSprite.scale.x = spriteScale
  heroSprite.scale.y = spriteScale
  if (!heroIdleTween) {
    heroSprite.x = heroBasePosition.x
    heroSprite.y = heroBasePosition.y
  } else {
    stopHeroIdle()
    heroSprite.x = heroBasePosition.x
    heroSprite.y = heroBasePosition.y
    startHeroIdle()
  }

  enemyBasePosition.x = width / 2 + pathWidth * 0.18
  enemyBasePosition.y = height / 2 - Math.min(80, pathWidth * 0.18)
  enemySprite.scale.x = spriteScale
  enemySprite.scale.y = spriteScale
  if (!enemyIdleTween) {
    enemySprite.x = enemyBasePosition.x
    enemySprite.y = enemyBasePosition.y
  } else {
    stopEnemyIdle()
    enemySprite.x = enemyBasePosition.x
    enemySprite.y = enemyBasePosition.y
    startEnemyIdle()
  }

  if (gamePhase === 'travel') {
    startTravelAnimation()
  }
}

const uiLayer = document.createElement('div')
uiLayer.className = 'ui-layer'
mount.appendChild(uiLayer)

const screens: HTMLElement[] = []

const createScreen = (className: string) => {
  const section = document.createElement('section')
  section.className = `screen ${className}`
  uiLayer.appendChild(section)
  screens.push(section)
  return section
}

const menuScreen = createScreen('menu-screen')
const menuTitle = document.createElement('h1')
menuTitle.textContent = 'Northbound Clash'
const menuSubtitle = document.createElement('p')
menuSubtitle.textContent = 'An endless northern trek where every ambush is a turn-based duel.'
const menuButton = document.createElement('button')
menuButton.className = 'button primary'
menuButton.textContent = 'Begin Journey'
menuButton.addEventListener('click', () => {
  showScreen(selectScreen)
})
menuScreen.append(menuTitle, menuSubtitle, menuButton)

const selectScreen = createScreen('select-screen')
const selectTitle = document.createElement('h2')
selectTitle.textContent = 'Choose Your Wanderer'
const selectDescription = document.createElement('p')
selectDescription.textContent = 'Each traveler brings their own color to the road north. Pick one to lead the charge.'

const characterPreview = document.createElement('div')
characterPreview.className = 'character-preview'
characterPreview.style.backgroundImage = `url(${heroSheet.url})`
characterPreview.style.backgroundSize = `${SPRITE_COUNT * 64}px 64px`

const characterGrid = document.createElement('div')
characterGrid.className = 'character-grid'

const characterNameLabel = document.createElement('p')
characterNameLabel.className = 'character-name'

const heroButtons: HTMLButtonElement[] = []
let selectedHeroIndex = 0

const setSelectedHero = (index: number) => {
  selectedHeroIndex = index
  heroButtons.forEach((btn, idx) => {
    btn.classList.toggle('selected', idx === index)
  })
  characterPreview.style.backgroundPosition = `-${index * 64}px 0px`
  characterNameLabel.textContent = heroNames[index]
}

for (let i = 0; i < SPRITE_COUNT; i += 1) {
  const button = document.createElement('button')
  button.className = 'character-option'
  button.style.backgroundImage = `url(${heroSheet.url})`
  button.style.backgroundSize = `${SPRITE_COUNT * 64}px 64px`
  button.style.backgroundPosition = `-${i * 64}px 0px`
  button.addEventListener('click', () => setSelectedHero(i))
  heroButtons.push(button)
  characterGrid.appendChild(button)
}

const embarkButton = document.createElement('button')
embarkButton.className = 'button primary'
embarkButton.textContent = 'Embark North'
embarkButton.addEventListener('click', () => {
  startGame()
})

selectScreen.append(selectTitle, selectDescription, characterPreview, characterGrid, characterNameLabel, embarkButton)

const hud = document.createElement('div')
hud.className = 'hud'

const hudLeft = document.createElement('div')
hudLeft.className = 'hud__group'
const playerLabel = document.createElement('p')
playerLabel.className = 'hud__label'
playerLabel.textContent = 'Wanderer'
const playerStats = document.createElement('p')
playerStats.className = 'hud__value'
const playerHealth = document.createElement('p')
playerHealth.className = 'hud__health'

hudLeft.append(playerLabel, playerStats, playerHealth)

const hudCenter = document.createElement('div')
hudCenter.className = 'hud__group'
const killsLabel = document.createElement('p')
killsLabel.className = 'hud__label'
killsLabel.textContent = 'Enemies defeated'
const killCountValue = document.createElement('p')
killCountValue.className = 'hud__value'
const statusText = document.createElement('p')
statusText.className = 'hud__status'

hudCenter.append(killsLabel, killCountValue, statusText)

const hudRight = document.createElement('div')
hudRight.className = 'hud__group'
const enemyLabel = document.createElement('p')
enemyLabel.className = 'hud__label'
enemyLabel.textContent = 'Current threat'
const enemyStats = document.createElement('p')
enemyStats.className = 'hud__value'
const enemyHealth = document.createElement('p')
enemyHealth.className = 'hud__health'

const hudActions = document.createElement('div')
hudActions.className = 'hud__actions'
const attackButton = document.createElement('button')
attackButton.className = 'button primary'
attackButton.textContent = 'Attack'
attackButton.disabled = true
hudActions.appendChild(attackButton)

hudRight.append(enemyLabel, enemyStats, enemyHealth, hudActions)
hud.append(hudLeft, hudCenter, hudRight)
uiLayer.appendChild(hud)

const endScreen = createScreen('end-screen')
const endTitle = document.createElement('h2')
endTitle.textContent = 'The journey pauses'
const endSummary = document.createElement('p')
const restartButton = document.createElement('button')
restartButton.className = 'button'
restartButton.textContent = 'Return to camp'
restartButton.addEventListener('click', () => {
  showScreen(menuScreen)
  hud.classList.remove('visible')
  setStatus('Choose your next path.')
  gamePhase = 'menu'
  stopTravelAnimation()
  stopHeroIdle()
  stopEnemyIdle()
  enemySprite.alpha = 0
  heroSprite.alpha = 0
  clearTimeouts()
})
endScreen.append(endTitle, endSummary, restartButton)

const showScreen = (screen: HTMLElement | null) => {
  screens.forEach((element) => {
    element.classList.toggle('active', element === screen)
  })
}

const setStatus = (text: string) => {
  statusText.textContent = text
}

showScreen(menuScreen)
setSelectedHero(0)
setStatus('Choose your path northward.')

const player: PlayerState = {
  health: 100,
  attack: 10,
  spriteIndex: 0,
  name: heroNames[0]
}

let killCount = 0
let nextEnemyLevel = 0
let currentEnemy: EnemyState | null = null
let gamePhase: GamePhase = 'menu'
let awaitingPlayerInput = false
let encounterTimeout: number | undefined
let turnTimeout: number | undefined

const clearTimeouts = () => {
  if (encounterTimeout !== undefined) {
    window.clearTimeout(encounterTimeout)
    encounterTimeout = undefined
  }
  if (turnTimeout !== undefined) {
    window.clearTimeout(turnTimeout)
    turnTimeout = undefined
  }
}

const updateHud = () => {
  playerStats.textContent = `${player.name} — ${player.attack} atk`
  playerHealth.textContent = `${Math.max(0, Math.round(player.health))} / 100 hp`
  killCountValue.textContent = killCount.toString()

  if (currentEnemy) {
    enemyStats.textContent = `${currentEnemy.name} — ${currentEnemy.attack} atk`
    enemyHealth.textContent = `${Math.max(0, Math.round(currentEnemy.health))} / ${currentEnemy.maxHealth} hp`
  } else {
    enemyStats.textContent = 'No threats'
    enemyHealth.textContent = ''
  }
}

const scheduleEncounter = () => {
  clearTimeouts()
  const delay = randomRange(2800, 5200)
  encounterTimeout = window.setTimeout(() => {
    if (gamePhase === 'travel') {
      spawnEnemy()
    }
  }, delay)
}

const beginTravel = () => {
  gamePhase = 'travel'
  currentEnemy = null
  attackButton.disabled = true
  setStatus('Traveling north... stay alert.')
  enemySprite.alpha = 0
  stopEnemyIdle()
  startTravelAnimation()
  scheduleEncounter()
  updateHud()
}

const spawnEnemy = () => {
  stopTravelAnimation()
  clearTimeouts()
  gamePhase = 'battle'
  awaitingPlayerInput = false

  const enemyIndex = nextEnemyLevel % SPRITE_COUNT
  const health = 10 + nextEnemyLevel * 10
  const attack = 1 + nextEnemyLevel
  const name = enemyNames[enemyIndex]

  currentEnemy = {
    health,
    maxHealth: health,
    attack,
    index: enemyIndex,
    name
  }

  enemySprite.setFrame(enemyIndex * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE)
  enemySprite.alpha = 1
  enemySprite.x = enemyBasePosition.x
  enemySprite.y = enemyBasePosition.y - 140
  startEnemyIdle()
  setStatus(`${name} ambushes you!`)
  updateHud()

  gsap.to(enemySprite, {
    y: enemyBasePosition.y,
    duration: 0.55,
    ease: 'power2.out',
    onComplete: () => {
      awaitingPlayerInput = true
      attackButton.disabled = false
      setStatus(`Strike first before ${name} does!`)
    }
  })
}

const handleEnemyDefeat = () => {
  if (!currentEnemy) return
  const defeatedName = currentEnemy.name
  killCount += 1
  nextEnemyLevel += 1
  currentEnemy = null
  awaitingPlayerInput = false
  updateHud()
  setStatus(`${defeatedName} is defeated. March onward!`)
  stopEnemyIdle()
  gsap.to(enemySprite, {
    alpha: 0,
    duration: 0.4,
    ease: 'power2.out'
  })
  turnTimeout = window.setTimeout(() => {
    if (player.health > 0) {
      beginTravel()
    }
  }, 650)
}

const handlePlayerDefeat = () => {
  gamePhase = 'end'
  awaitingPlayerInput = false
  stopTravelAnimation()
  stopEnemyIdle()
  stopHeroIdle()
  attackButton.disabled = true
  setStatus('You collapse on the frozen road...')
  enemySprite.alpha = 0
  hud.classList.remove('visible')
  endSummary.textContent = `You felled ${killCount} foe${killCount === 1 ? '' : 's'} before falling.`
  showScreen(endScreen)
}

const executeEnemyTurn = () => {
  if (!currentEnemy) return
  awaitingPlayerInput = false
  attackButton.disabled = true
  const damage = currentEnemy.attack

  gsap.to(enemySprite, {
    x: enemyBasePosition.x - 28,
    duration: 0.18,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(enemySprite, {
        x: enemyBasePosition.x,
        duration: 0.24,
        ease: 'power2.inOut'
      })
    }
  })

  gsap.to(heroSprite, {
    x: heroBasePosition.x - 16,
    duration: 0.14,
    delay: 0.18,
    repeat: 1,
    yoyo: true,
    ease: 'power2.inOut'
  })

  turnTimeout = window.setTimeout(() => {
    player.health -= damage
    setStatus(`${currentEnemy?.name ?? 'The foe'} strikes for ${damage} damage!`)
    updateHud()
    if (player.health <= 0) {
      handlePlayerDefeat()
    } else {
      awaitingPlayerInput = true
      attackButton.disabled = false
      setStatus('Your turn to retaliate!')
    }
  }, 420)
}

const executePlayerAttack = () => {
  if (!currentEnemy || !awaitingPlayerInput) return
  awaitingPlayerInput = false
  attackButton.disabled = true

  const damage = player.attack

  gsap.to(heroSprite, {
    x: heroBasePosition.x + 34,
    duration: 0.2,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(heroSprite, {
        x: heroBasePosition.x,
        duration: 0.24,
        ease: 'power2.inOut'
      })
    }
  })

  gsap.to(enemySprite, {
    x: enemyBasePosition.x + 22,
    duration: 0.12,
    delay: 0.2,
    repeat: 1,
    yoyo: true,
    ease: 'power2.out'
  })

  turnTimeout = window.setTimeout(() => {
    if (!currentEnemy) return
    currentEnemy.health -= damage
    setStatus(`You slash ${currentEnemy.name} for ${damage} damage!`)
    updateHud()
    if (currentEnemy.health <= 0) {
      handleEnemyDefeat()
    } else {
      turnTimeout = window.setTimeout(() => {
        executeEnemyTurn()
      }, 300)
    }
  }, 420)
}

attackButton.addEventListener('click', executePlayerAttack)

const startGame = () => {
  clearTimeouts()
  killCount = 0
  nextEnemyLevel = 0
  player.health = 100
  player.attack = 10
  player.spriteIndex = selectedHeroIndex
  player.name = heroNames[selectedHeroIndex]
  heroSprite.setFrame(selectedHeroIndex * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE)
  heroSprite.alpha = 1
  heroSprite.x = heroBasePosition.x
  heroSprite.y = heroBasePosition.y
  showScreen(null)
  hud.classList.add('visible')
  gamePhase = 'travel'
  setStatus('Traveling north... stay alert.')
  startHeroIdle()
  beginTravel()
  updateHud()
}

window.addEventListener('resize', () => {
  layoutScene()
})

layoutScene()
updateHud()

export {}
