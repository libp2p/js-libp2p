import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { webSocketToMaConn } from '../src/websocket-to-conn.ts'
import type { MultiaddrConnection } from '@libp2p/interface'
import type { SinonFakeTimers, SinonSpy } from 'sinon'

// Explicit registration keeps browser bundlers from removing the shared tests.
export function registerWebSocketPollTests (): void {
  describe('WebSocket buffered-amount poll ownership', () => {
    let clock: SinonFakeTimers
    let websocket: EventTarget & {
      bufferedAmount: number
      send: SinonSpy
      close: SinonSpy
    }
    let connection: MultiaddrConnection

    beforeEach(() => {
      clock = Sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      // Do not emit close here: the close-event listener would mask missing
      // immediate poll cancellation. Real socket behavior is covered in node.ts.
      websocket = Object.assign(new EventTarget(), {
        bufferedAmount: 2,
        send: Sinon.spy(),
        close: Sinon.spy()
      })
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
        websocket.dispatchEvent(Object.assign(new Event('close'), { code: 1000, reason: '', wasClean: true }))
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
      expect(websocket.bufferedAmount).to.equal(2)
      expect(websocket.close.args).to.deep.equal([[]])
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
      expect(websocket.send.callCount).to.equal(2)
      expect(websocket.close.args).to.deep.equal([])
      expect(connection.status).to.equal('open')
    })
  })
}
