import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { webSocketToMaConn } from '../src/websocket-to-conn.ts'
import type { MultiaddrConnection } from '@libp2p/interface'
import type { SinonFakeTimers } from 'sinon'

// A portable WebSocket contract stub: close validates its code and enters
// CLOSING, but does not synthesize a close event or discard buffered data.
class BufferedWebSocket extends EventTarget {
  readyState = 1
  bufferedAmount = 2
  sends = 0
  closeCodes: Array<number | undefined> = []

  send (): void {
    this.sends++
  }

  close (code?: number): void {
    this.closeCodes.push(code)
    if (code != null && code !== 1000 && (code < 3000 || code > 4999)) {
      throw new DOMException('Invalid close code', 'InvalidAccessError')
    }
    this.readyState = 2
  }

  finishClose (): void {
    this.readyState = 3
    this.dispatchEvent(Object.assign(new Event('close'), { code: 1000, reason: '', wasClean: true }))
  }
}

// Explicit registration keeps browser bundlers from removing the shared tests.
export function registerWebSocketPollTests (): void {
  describe('WebSocket buffered-amount poll ownership', () => {
    let clock: SinonFakeTimers
    let websocket: BufferedWebSocket
    let connection: MultiaddrConnection

    beforeEach(() => {
      clock = Sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      websocket = new BufferedWebSocket()
      connection = webSocketToMaConn({
        websocket: websocket as unknown as WebSocket,
        remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/1234/ws'),
        direction: 'outbound',
        log: defaultLogger().forComponent('websocket-poll-test'),
        maxBufferedAmount: 1,
        bufferedAmountPollInterval: 10
      })
    })

    afterEach(async () => {
      try {
        // Fallback fixture cleanup is after assertions, including baseline
        // failures. Never let a queued callback rearm after the clock restores.
        websocket.finishClose()
        await clock.tickAsync(0)
      } finally {
        clock.restore()
      }
    })

    it('stops polling on abort without waiting for the native close event', async () => {
      const closed = Sinon.spy()
      const drained = Sinon.spy()
      connection.addEventListener('close', closed)
      connection.addEventListener('drain', drained)
      expect(connection.send(new Uint8Array([1]))).to.equal(false)
      expect(clock.countTimers()).to.equal(1)

      const error = new Error('controlled abort')
      connection.abort(error)

      expect(clock.countTimers()).to.equal(0)
      expect(connection.status).to.equal('aborted')
      expect(websocket.readyState).to.equal(2)
      expect(websocket.bufferedAmount).to.equal(2)
      expect(websocket.closeCodes).to.deep.equal([undefined])
      expect(closed.callCount).to.equal(1)
      expect(closed.firstCall.args[0].error).to.equal(error)
      await clock.tickAsync(30)
      expect(clock.countTimers()).to.equal(0)
      expect(drained.callCount).to.equal(0)
    })

    it('does not rearm a poll already queued when the connection aborts', async () => {
      expect(connection.send(new Uint8Array([1]))).to.equal(false)
      clock.tick(10) // The repeating task has queued its promise continuation.
      connection.abort(new Error('abort queued poll'))

      await clock.tickAsync(30)

      expect(clock.countTimers()).to.equal(0)
      expect(websocket.readyState).to.equal(2)
      expect(websocket.bufferedAmount).to.equal(2)
    })

    it('continues active backpressure polling until data drains', async () => {
      const drained = Sinon.spy()
      connection.addEventListener('drain', drained)
      expect(connection.send(new Uint8Array([1]))).to.equal(false)
      await clock.tickAsync(10)
      expect(clock.countTimers()).to.equal(1)
      expect(drained.callCount).to.equal(0)

      websocket.bufferedAmount = 0
      await clock.tickAsync(10)

      expect(drained.callCount).to.equal(1)
      expect(clock.countTimers()).to.equal(0)
      expect(connection.send(new Uint8Array([2]))).to.equal(true)
      expect(websocket.sends).to.equal(2)
      expect(websocket.closeCodes).to.deep.equal([])
      expect(connection.status).to.equal('open')
    })
  })
}
