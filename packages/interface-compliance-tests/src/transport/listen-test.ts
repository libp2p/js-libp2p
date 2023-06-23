/* eslint max-nested-callbacks: ["error", 8] */
import { CustomEvent, EventEmitter } from '@libp2p/interface/events'
import { writeableStreamToDrain, readableStreamFromArray } from '@libp2p/utils/stream'
import { expect } from 'aegir/chai'
import defer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { isValidTick } from '../is-valid-tick.js'
import { mockUpgrader, mockRegistrar } from '../mocks/index.js'
import type { TransportTestFixtures } from './index.js'
import type { TestSetup } from '../index.js'
import type { Connection } from '@libp2p/interface/connection'
import type { Transport, Upgrader } from '@libp2p/interface/transport'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

export default (common: TestSetup<TransportTestFixtures>): void => {
  describe('listen', () => {
    let upgrader: Upgrader
    let addrs: Multiaddr[]
    let transport: Transport
    let registrar: Registrar

    before(async () => {
      registrar = mockRegistrar()
      upgrader = mockUpgrader({
        registrar,
        events: new EventEmitter()
      });

      ({ transport, addrs } = await common.setup())
    })

    after(async () => {
      await common.teardown()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('simple', async () => {
      const listener = transport.createListener({
        upgrader
      })
      await listener.listen(addrs[0])
      await listener.close()
    })

    it('close listener with connections, through timeout', async () => {
      const upgradeSpy = sinon.spy(upgrader, 'upgradeInbound')
      const listenerConns: Connection[] = []

      const protocol = '/test/protocol'
      void registrar.handle(protocol, (data) => {
        void data.stream.readable
          .pipeTo(writeableStreamToDrain())
      })

      const listener = transport.createListener({
        upgrader,
        handler: (conn) => {
          listenerConns.push(conn)
        }
      })

      // Listen
      await listener.listen(addrs[0])

      // Create two connections to the listener
      const [conn1] = await Promise.all([
        transport.dial(addrs[0], {
          upgrader
        }),
        transport.dial(addrs[0], {
          upgrader
        })
      ])

      // Give the listener a chance to finish its upgrade
      await pWaitFor(() => listenerConns.length === 2)

      const stream1 = await conn1.newStream([protocol])

      // Wait for the data send and close to finish
      await Promise.all([
        readableStreamFromArray([uint8ArrayFromString('Some data that is never handled')])
          .pipeThrough(stream1)
          .pipeTo(writeableStreamToDrain()),
        // Closer the listener (will take a couple of seconds to time out)
        listener.close()
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

      const listener = transport.createListener({
        upgrader
      })

      // Listen
      await listener.listen(addrs[0])

      // Create a connection to the listener
      const conn = await transport.dial(addrs[0], {
        upgrader
      })

      await pWaitFor(() => typeof conn.timeline.close === 'number')
      await listener.close()
    })

    describe('events', () => {
      it('connection', async () => {
        const upgradeSpy = sinon.spy(upgrader, 'upgradeInbound')
        const listener = transport.createListener({
          upgrader
        })
        const deferred = defer()
        let conn

        listener.addEventListener('connection', (evt) => {
          conn = evt.detail
          deferred.resolve()
        })

        void (async () => {
          await listener.listen(addrs[0])
          await transport.dial(addrs[0], {
            upgrader
          })
        })()

        await deferred.promise

        await expect(upgradeSpy.getCall(0).returnValue).to.eventually.equal(conn)
        expect(upgradeSpy.callCount).to.equal(1)
        await listener.close()
      })

      it('listening', (done) => {
        const listener = transport.createListener({
          upgrader
        })
        listener.addEventListener('listening', () => {
          listener.close().then(done, done)
        })
        void listener.listen(addrs[0])
      })

      it('error', (done) => {
        const listener = transport.createListener({
          upgrader
        })
        listener.addEventListener('error', (evt) => {
          expect(evt.detail).to.be.an.instanceOf(Error)
          listener.close().then(done, done)
        })
        listener.dispatchEvent(new CustomEvent('error', {
          detail: new Error('my err')
        }))
      })

      it('close', (done) => {
        const listener = transport.createListener({
          upgrader
        })
        listener.addEventListener('close', () => { done() })

        void (async () => {
          await listener.listen(addrs[0])
          await listener.close()
        })()
      })
    })
  })
}
