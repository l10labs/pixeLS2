export interface ApplicationInitOptions {
  background?: string
  width?: number
  height?: number
  resizeTo?: Window | HTMLElement
}

const DEFAULT_BACKGROUND = '#0f172a'

const colorToStyle = (color: number | string, alpha = 1): string => {
  if (typeof color === 'string') {
    return color
  }

  const hex = color.toString(16).padStart(6, '0')
  if (alpha >= 1) {
    return `#${hex}`
  }

  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export abstract class DisplayObject {
  [key: string]: unknown
  x = 0
  y = 0
  rotation = 0
  alpha = 1
  scale = { x: 1, y: 1 }
  parent: Container | null = null

  protected abstract drawSelf(ctx: CanvasRenderingContext2D): void

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.scale(this.scale.x, this.scale.y)
    const previousAlpha = ctx.globalAlpha
    ctx.globalAlpha = previousAlpha * this.alpha
    this.drawSelf(ctx)
    ctx.globalAlpha = previousAlpha
    ctx.restore()
  }
}

export class Container extends DisplayObject {
  children: DisplayObject[] = []

  addChild<T extends DisplayObject>(child: T): T {
    child.parent = this
    this.children.push(child)
    return child
  }

  removeChild<T extends DisplayObject>(child: T): T {
    const index = this.children.indexOf(child)
    if (index >= 0) {
      this.children.splice(index, 1)
      child.parent = null
    }
    return child
  }

  protected drawSelf(ctx: CanvasRenderingContext2D) {
    for (const child of this.children) {
      child.render(ctx)
    }
  }
}

type Shape =
  | {
      type: 'circle'
      radius: number
      offsetX: number
      offsetY: number
      fill: string
    }
  | {
      type: 'polygon'
      points: number[]
      fill: string
    }

export class Graphics extends Container {
  private shapes: Shape[] = []
  private currentFill: { color: string; alpha: number } | null = null

  clear() {
    this.shapes = []
  }

  beginFill(color: number | string, alpha = 1) {
    this.currentFill = { color: colorToStyle(color, alpha), alpha }
  }

  endFill() {
    this.currentFill = null
  }

  drawCircle(x: number, y: number, radius: number) {
    if (!this.currentFill) return
    this.shapes.push({
      type: 'circle',
      radius,
      offsetX: x,
      offsetY: y,
      fill: this.currentFill.color
    })
  }

  drawPolygon(points: number[]) {
    if (!this.currentFill) return
    this.shapes.push({ type: 'polygon', points: [...points], fill: this.currentFill.color })
  }

  protected drawSelf(ctx: CanvasRenderingContext2D) {
    for (const shape of this.shapes) {
      ctx.save()
      ctx.fillStyle = shape.fill
      if (shape.type === 'circle') {
        ctx.beginPath()
        ctx.arc(shape.offsetX, shape.offsetY, shape.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
      } else if (shape.type === 'polygon') {
        const [startX, startY, ...rest] = shape.points
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        for (let i = 0; i < rest.length; i += 2) {
          ctx.lineTo(rest[i], rest[i + 1])
        }
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }

    super.drawSelf(ctx)
  }
}

export type SpriteSource = HTMLImageElement | HTMLCanvasElement

export class Sprite extends DisplayObject {
  private source: SpriteSource
  private frame = { x: 0, y: 0, width: 0, height: 0 }
  anchor = { x: 0.5, y: 0.5 }

  constructor(source: SpriteSource) {
    super()
    this.source = source
    const width = (source as { width?: number }).width ?? 0
    const height = (source as { height?: number }).height ?? 0
    this.frame = { x: 0, y: 0, width, height }
  }

  setFrame(x: number, y: number, width: number, height: number) {
    this.frame = { x, y, width, height }
  }

  setAnchor(x: number, y: number) {
    this.anchor.x = x
    this.anchor.y = y
  }

  protected drawSelf(ctx: CanvasRenderingContext2D) {
    const { x, y, width, height } = this.frame
    if (!width || !height) return

    const offsetX = width * this.anchor.x
    const offsetY = height * this.anchor.y

    ctx.drawImage(this.source, x, y, width, height, -offsetX, -offsetY, width, height)
  }
}

export class Application {
  readonly stage = new Container()
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private background: string = DEFAULT_BACKGROUND
  private animationFrame: number | null = null

  constructor() {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to acquire 2D rendering context')
    }
    this.ctx = context
  }

  async init(options: ApplicationInitOptions = {}) {
    const { background = DEFAULT_BACKGROUND, width = 800, height = 600, resizeTo } = options
    this.background = background

    if (resizeTo instanceof Window) {
      this.resizeWithWindow(resizeTo)
    } else if (resizeTo) {
      this.resizeToElement(resizeTo)
    } else {
      this.canvas.width = width
      this.canvas.height = height
    }

    this.start()
  }

  private resizeWithWindow(target: Window) {
    const updateSize = () => {
      this.canvas.width = target.innerWidth
      this.canvas.height = target.innerHeight
    }
    target.addEventListener('resize', updateSize)
    updateSize()
  }

  private resizeToElement(element: HTMLElement) {
    const updateSize = () => {
      this.canvas.width = element.clientWidth
      this.canvas.height = element.clientHeight
    }
    window.addEventListener('resize', updateSize)
    updateSize()
  }

  private start() {
    const loop = () => {
      this.animationFrame = requestAnimationFrame(loop)
      this.render()
    }
    loop()
  }

  private render() {
    this.ctx.save()
    this.ctx.fillStyle = this.background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.restore()

    this.stage.render(this.ctx)
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }
}
