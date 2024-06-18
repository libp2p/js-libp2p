/* eslint max-nested-callbacks: ["error", 8] */
import { CustomEvent, TypedEventEmitter } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import defer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { isValidTick } from '../is-valid-tick.js'
import { mockUpgrader, mockRegistrar } from '../mocks/index.js'
import type { TransportTestFixtures } from './index.js'
import type { TestSetup } from '../index.js'
import type { Connection, Transport, Upgrader } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export default (common: TestSetup<TransportTestFixtures>): void => {
  describe('listen', () => {
    let upgrader: Upgrader
    let listenAddrs: Multiaddr[]
    let dialAddrs: Multiaddr[]
    let dialer: Transport
    let listener: Transport
    let registrar: Registrar

    before(async () => {
      registrar = mockRegistrar()
      upgrader = mockUpgrader({
        registrar,
        events: new TypedEventEmitter()
      });

      ({ dialer, listener, listenAddrs, dialAddrs } = await common.setup())
    })

    after(async () => {
      await common.teardown()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('simple', async () => {
      const listen = listener.createListener({
        upgrader
      })
      await listen.listen(listenAddrs[0])
      await listen.close()
    })

    it('close listener with connections, through timeout', async () => {
      const upgradeSpy = sinon.spy(upgrader, 'upgradeInbound')
      const listenerConns: Connection[] = []

      const protocol = '/test/protocol'
      void registrar.handle(protocol, (data) => {
        void drain(data.stream.source)
      })

      const listen = listener.createListener({
        upgrader,
        handler: (conn) => {
          listenerConns.push(conn)
        }
      })

      // Listen
      await listen.listen(listenAddrs[0])

      // Create two connections to the listener
      const [conn1] = await Promise.all([
        dialer.dial(dialAddrs[0], {
          upgrader
        }),
        dialer.dial(dialAddrs[0], {
          upgrader
        })
      ])

      // Give the listener a chance to finish its upgrade
      await pWaitFor(() => listenerConns.length === 2)

      const stream1 = await conn1.newStream([protocol])

      // Wait for the data send and close to finish
      await Promise.all([
        pipe(
          [uint8ArrayFromString('Some data that is never handled')],
          stream1
        ),
        // Closer the listener (will take a couple of seconds to time out)
        listen.close()
      ])

      await stream1.close()
      await conn1.close()

      expect(isValidTick(conn1.timeline.close)).to.equal(true)
      listenerConns.forEach(conn => {
        expect(isValidTick(conn.timeline.close)).to.equal(true)
      })

      // 2 dials = 2 connections upgraded
      expect(upgradeSpy.callCount).to.equal(2)
    })

    it('should not handle connection if upgradeInbound throws', async () => {
      sinon.stub(upgrader, 'upgradeInbound').throws()

      const listen = listener.createListener({
        upgrader
      })

      // Listen
      await listen.listen(listenAddrs[0])

      // Create a connection to the listener
      const conn = await dialer.dial(dialAddrs[0], {
        upgrader
      })

      await pWaitFor(() => typeof conn.timeline.close === 'number')
      await listen.close()
    })

    describe('events', () => {
      it('connection', async () => {
        const upgradeSpy = sinon.spy(upgrader, 'upgradeInbound')
        const listen = listener.createListener({
          upgrader
        })
        const deferred = defer()
        let conn

        listen.addEventListener('connection', (evt) => {
          conn = evt.detail
          deferred.resolve()
        })

        void (async () => {
          await listen.listen(listenAddrs[0])
          await dialer.dial(dialAddrs[0], {
            upgrader
          })
        })()

        await deferred.promise

        await expect(upgradeSpy.getCall(0).returnValue).to.eventually.equal(conn)
        expect(upgradeSpy.callCount).to.equal(1)
        await listen.close()
      })

      it('listening', (done) => {
        const listen = listener.createListener({
          upgrader
        })
        listen.addEventListener('listening', () => {
          listen.close().then(done, done)
        })
        void listen.listen(listenAddrs[0])
      })

      it('error', (done) => {
        const listen = listener.createListener({
          upgrader
        })
        listen.addEventListener('error', (evt) => {
          expect(evt.detail).to.be.an.instanceOf(Error)
          listen.close().then(done, done)
        })
        listen.dispatchEvent(new CustomEvent('error', {
          detail: new Error('my err')
        }))
      })

      it('close', (done) => {
        const listen = listener.createListener({
          upgrader
        })
        listen.addEventListener('close', () => { done() })

        void (async () => {
          await listen.listen(listenAddrs[0])
          await listen.close()
        })()
      })
    })
  })
}
