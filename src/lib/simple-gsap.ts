export type EaseFunction = (t: number) => number

export interface TweenVars {
  duration?: number
  delay?: number
  repeat?: number
  yoyo?: boolean
  ease?: EaseFunction | string
  onUpdate?: () => void
  onComplete?: () => void
  onRepeat?: () => void
  [key: string]: unknown
}

interface TweenState {
  property: string
  start: number
  end: number
  initialStart: number
  initialEnd: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const EASES: Record<string, EaseFunction> = {
  linear: (t) => t,
  'sine.inOut': (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  'power2.out': (t) => 1 - Math.pow(1 - t, 2),
  'power2.inOut': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
}

const resolveEase = (ease?: EaseFunction | string): EaseFunction => {
  if (!ease) return EASES.linear
  if (typeof ease === 'function') return ease
  return EASES[ease] ?? EASES.linear
}

class Tween {
  private startTime = 0
  private delay = 0
  private duration = 0
  private states: TweenState[] = []
  private ease: EaseFunction
  private rafId: number | null = null
  private repeat = 0
  private repeatCounter = 0
  private yoyo = false
  private reversed = false
  private target: Record<string, number>
  private vars: TweenVars

  constructor(target: unknown, vars: TweenVars) {
    this.target = target as Record<string, number>
    this.vars = vars
    const { duration = 1, delay = 0, ease, repeat = 0, yoyo = false } = vars
    this.duration = Math.max(0.0001, duration)
    this.delay = Math.max(0, delay)
    this.ease = resolveEase(ease)
    this.repeat = repeat
    this.repeatCounter = repeat
    this.yoyo = yoyo

    this.states = Object.entries(vars)
      .filter(([key]) => !['duration', 'delay', 'ease', 'repeat', 'yoyo', 'onUpdate', 'onComplete', 'onRepeat'].includes(key))
      .map(([property, endValue]) => {
        const startValue = Number(this.target[property])
        return {
          property,
          start: startValue,
          end: Number(endValue),
          initialStart: startValue,
          initialEnd: Number(endValue)
        }
      })
  }

  play() {
    this.startTime = performance.now()
    const tick = () => {
      const now = performance.now()
      const elapsed = now - this.startTime
      if (elapsed < this.delay * 1000) {
        this.rafId = requestAnimationFrame(tick)
        return
      }

      const progress = clamp((elapsed - this.delay * 1000) / (this.duration * 1000), 0, 1)
      const eased = this.ease(this.reversed ? 1 - progress : progress)

      for (const state of this.states) {
        const value = state.start + (state.end - state.start) * eased
        ;(this.target as Record<string, number>)[state.property] = value
      }

      this.vars.onUpdate?.()

      if (progress >= 1) {
        if (this.repeat === -1 || this.repeatCounter > 0) {
          if (this.repeatCounter > 0) {
            this.repeatCounter -= 1
          }
          if (this.yoyo) {
            this.reversed = !this.reversed
          } else {
            for (const state of this.states) {
              state.start = state.initialStart
              state.end = state.initialEnd
              ;(this.target as Record<string, number>)[state.property] = state.initialStart
            }
          }
          this.startTime = performance.now()
          this.vars.onRepeat?.()
          this.rafId = requestAnimationFrame(tick)
          return
        }

        this.vars.onComplete?.()
        return
      }

      this.rafId = requestAnimationFrame(tick)
    }

    this.rafId = requestAnimationFrame(tick)
    return this
  }

  kill() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
    }
  }
}

class Timeline {
  private tweens: { tween: Tween; offset: number }[] = []
  private startTime = 0
  private duration = 0
  private rafId: number | null = null
  private repeat = 0
  private repeatCounter = 0

  constructor(options: { repeat?: number } = {}) {
    this.repeat = options.repeat ?? 0
    this.repeatCounter = this.repeat
  }

  to(target: unknown, vars: TweenVars, position?: number) {
    const tween = new Tween(target, vars)
    const offset = (position ?? this.duration) * 1000
    const endTime = offset + (vars.duration ?? 1) * 1000 + (vars.delay ?? 0) * 1000
    this.duration = Math.max(this.duration, endTime / 1000)
    this.tweens.push({ tween, offset })
    return this
  }

  play() {
    this.startTime = performance.now()
    const tick = () => {
      const now = performance.now()
      const elapsed = now - this.startTime

      for (const entry of this.tweens) {
        if (elapsed >= entry.offset && !(entry as { started?: boolean }).started) {
          ;(entry as { started?: boolean }).started = true
          entry.tween.play()
        }
      }

      if (elapsed >= this.duration * 1000) {
        if (this.repeat === -1 || this.repeatCounter > 0) {
          if (this.repeatCounter > 0) {
            this.repeatCounter -= 1
          }
          for (const entry of this.tweens) {
            entry.tween.kill()
            ;(entry as { started?: boolean }).started = false
          }
          this.startTime = performance.now()
          this.rafId = requestAnimationFrame(tick)
          return
        }
        return
      }

      this.rafId = requestAnimationFrame(tick)
    }

    this.rafId = requestAnimationFrame(tick)
    return this
  }

  kill() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    for (const entry of this.tweens) {
      entry.tween.kill()
    }
  }
}

export const gsap = {
  to(target: unknown, vars: TweenVars) {
    return new Tween(target, vars).play()
  },
  timeline(options?: { repeat?: number }) {
    return new Timeline(options)
  }
}

export type TweenInstance = ReturnType<typeof gsap.to>
export type TimelineInstance = ReturnType<typeof gsap.timeline>
