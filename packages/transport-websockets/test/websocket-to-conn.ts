import { UnsupportedOperationError } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { webSocketToMaConn } from '../src/websocket-to-conn.ts'
import type { MultiaddrConnection } from '@libp2p/interface'

export function webSocketToMaConnTests (): void {
  describe('WebSocket backpressure support', () => {
    afterEach(() => {
      Sinon.restore()
    })

    function createConnection (websocket: WebSocket): MultiaddrConnection {
      return webSocketToMaConn({
        websocket,
        remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/1234/ws'),
        direction: 'outbound',
        log: defaultLogger().forComponent('test:websockets'),
        maxBufferedAmount: 4,
        bufferedAmountPollInterval: 10
      })
    }

    for (const value of [undefined, null, '0', Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      it(`rejects an unsupported bufferedAmount (${typeof value}: ${String(value)}) and closes the socket`, () => {
        const websocket = stubInterface<WebSocket>({ bufferedAmount: 0 })
        Object.defineProperty(websocket, 'bufferedAmount', { value })

        expect(() => createConnection(websocket)).to.throw(UnsupportedOperationError, 'bufferedAmount')
        expect(websocket.close).to.have.property('calledOnce', true)
        expect(websocket.send).to.have.property('called', false)
        expect(websocket.addEventListener).to.have.property('called', false)
      })
    }

    it('keeps the capability error if closing the unsupported socket throws', () => {
      const websocket = stubInterface<WebSocket>({ bufferedAmount: 0 })
      Object.defineProperty(websocket, 'bufferedAmount', { value: undefined })
      websocket.close.throws(new Error('close failed'))

      expect(() => createConnection(websocket)).to.throw(UnsupportedOperationError, 'bufferedAmount')
    })

    it('accepts a supported socket with no buffered bytes', async () => {
      const websocket = stubInterface<WebSocket>({ bufferedAmount: 0 })
      const connection = createConnection(websocket)

      expect(connection.send(Uint8Array.from([1]))).to.be.true()
      expect(websocket.send).to.have.property('calledOnce', true)
      expect(connection.writableNeedsDrain).to.be.false()
      await connection.close()
    })

    it('preserves backpressure and drains when the real buffer becomes empty', async () => {
      const clock = Sinon.useFakeTimers()
      const websocket = stubInterface<WebSocket>({ bufferedAmount: 4 })
      const connection = createConnection(websocket)
      const drained = Sinon.spy()
      connection.addEventListener('drain', drained)

      expect(connection.send(Uint8Array.from([1]))).to.be.false()
      expect(connection.writableNeedsDrain).to.be.true()
      await clock.tickAsync(10)
      expect(drained).to.have.property('called', false)

      Object.defineProperty(websocket, 'bufferedAmount', { value: 0 })
      await clock.tickAsync(10)
      expect(drained).to.have.property('calledOnce', true)
      expect(connection.writableNeedsDrain).to.be.false()
      await connection.close()
    })
  })
}
