import type { WebSocket as WSSWebSocket } from 'ws'

/**
 * Adds properties/methods to a `WebSocket` instance from the `ws` module to be
 * compatible with the `globalThis.WebSocket` API
 */
export function toWebSocket (ws: WSSWebSocket): WebSocket {
  Object.defineProperty(ws, 'url', {
    value: '',
    writable: false
  })

  // @ts-expect-error not a WS/WebSocket method
  ws.dispatchEvent = (evt: Event) => {
    if (evt.type === 'close') {
      ws.emit('close')
    }

    if (evt.type === 'open') {
      ws.emit('open')
    }

    if (evt.type === 'message') {
      const m = evt as MessageEvent
      ws.emit('data', m.data)
    }

    if (evt.type === 'error') {
      ws.emit('error', new Error('An error occurred'))
    }
    ws.emit(evt.type, evt)
  }

  // @ts-expect-error ws is now WebSocket
  return ws
}
