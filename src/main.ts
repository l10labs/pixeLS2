import './style.css'
import { Application } from './lib/simple-pixi'

const app = new Application()

const mount = document.querySelector<HTMLDivElement>('#app')
if (!mount) {
  throw new Error('Root container "#app" was not found')
}

await app.init({ background: '#000000', resizeTo: window })
mount.appendChild(app.canvas)

const title = document.createElement('div')
title.className = 'title'
title.textContent = 'PixeLS2'
mount.appendChild(title)
