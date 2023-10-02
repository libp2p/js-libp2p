import { AbortError } from '@libp2p/interface/errors'
import { EventEmitter } from '@libp2p/interface/events'
import { expect } from 'aegir/chai'
import all from 'it-all'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { isValidTick } from '../is-valid-tick.js'
import { mockUpgrader, mockRegistrar } from '../mocks/index.js'
import type { TransportTestFixtures, Connector } from './index.js'
import type { TestSetup } from '../index.js'
import type { Listener, Transport, Upgrader } from '@libp2p/interface/transport'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

export default (common: TestSetup<TransportTestFixtures>): void => {
  describe('dial', () => {
    let upgrader: Upgrader
    let registrar: Registrar
    let addrs: Multiaddr[]
    let listeningAddrs: Multiaddr[]
    let transport: Transport
    let connector: Connector
    let listener: Listener
    let hasListener: boolean

    before(async () => {
      registrar = mockRegistrar()
      upgrader = mockUpgrader({
        registrar,
        events: new EventEmitter()
      });

      ({ addrs, transport, connector, listeningAddrs =[], hasListener = true } = await common.setup())
    })

    after(async () => {
      await common.teardown()
    })

    beforeEach(async () => {
      if (hasListener) {
        listener = transport.createListener({
          upgrader
        })
        listeningAddrs.length > 0 ? await listener.listen(listeningAddrs[0]) : await listener.listen(addrs[0])
      }
    })

    afterEach(async () => {
      sinon.restore()
      connector.restore()
      if (hasListener)
        await listener.close()
    })

    it('simple', async () => {
      const protocol = '/hello/1.0.0'
      void registrar.handle(protocol, (data) => {
        void pipe([
          uint8ArrayFromString('hey')
        ],
          data.stream,
          drain
        )
      })

      const upgradeSpy = sinon.spy(upgrader, 'upgradeOutbound')
      const conn = await transport.dial(listeningAddrs[0], {
        upgrader
      })

      const stream = await conn.newStream([protocol])
      const result = await all(stream.source)

      expect(upgradeSpy.callCount).to.equal(1)
      await expect(upgradeSpy.getCall(0).returnValue).to.eventually.equal(conn)
      expect(result.length).to.equal(1)
      expect(result[0].subarray()).to.equalBytes(uint8ArrayFromString('hey'))
      await conn.close()
    })

    it('can close connections', async () => {
      const upgradeSpy = sinon.spy(upgrader, 'upgradeOutbound')
      const conn = await transport.dial(addrs[0], {
        upgrader
      })

      expect(upgradeSpy.callCount).to.equal(1)
      await expect(upgradeSpy.getCall(0).returnValue).to.eventually.equal(conn)
      await conn.close()
      expect(isValidTick(conn.timeline.close)).to.equal(true)
    })

    it('to non existent listener', async () => {
      const upgradeSpy = sinon.spy(upgrader, 'upgradeOutbound')

      await expect(transport.dial(addrs[1], {
        upgrader
      })).to.eventually.be.rejected()
      expect(upgradeSpy.callCount).to.equal(0)
    })

    it('abort before dialing throws AbortError', async () => {
      const upgradeSpy = sinon.spy(upgrader, 'upgradeOutbound')
      const controller = new AbortController()
      controller.abort()
      const conn = transport.dial(addrs[0], { signal: controller.signal, upgrader })

      await expect(conn).to.eventually.be.rejected().with.property('code', AbortError.code)
      expect(upgradeSpy.callCount).to.equal(0)
    })

    it('abort while dialing throws AbortError', async () => {
      const upgradeSpy = sinon.spy(upgrader, 'upgradeOutbound')
      // Add a delay to connect() so that we can abort while the dial is in
      // progress
      connector.delay(100)

      const controller = new AbortController()
      const conn = transport.dial(addrs[0], { signal: controller.signal, upgrader })
      setTimeout(() => { controller.abort() }, 50)

      await expect(conn).to.eventually.be.rejected().with.property('code', AbortError.code)
      expect(upgradeSpy.callCount).to.equal(0)
    })
  })
}
