import { start, stop } from '@libp2p/interfaces/startable'
import { isMultiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import type { TestSetup } from '@libp2p/interface-compliance-tests'
import type { PeerDiscovery } from '@libp2p/interface-peer-discovery'

export default (common: TestSetup<PeerDiscovery>): void => {
  describe('interface-peer-discovery compliance tests', () => {
    let discovery: PeerDiscovery

    beforeEach(async () => {
      discovery = await common.setup()
    })

    afterEach('ensure discovery was stopped', async () => {
      await stop(discovery)

      await common.teardown()
    })

    it('can start the service', async () => {
      await start(discovery)
    })

    it('can start and stop the service', async () => {
      await start(discovery)
      await stop(discovery)
    })

    it('should not fail to stop the service if it was not started', async () => {
      await stop(discovery)
    })

    it('should not fail to start the service if it is already started', async () => {
      await start(discovery)
      await start(discovery)
    })

    it('should emit a peer event after start', async () => {
      const defer = pDefer()

      discovery.addEventListener('peer', (evt) => {
        const { id, multiaddrs } = evt.detail
        expect(id).to.exist()
        expect(id)
          .to.have.property('type')
          .that.is.oneOf(['RSA', 'Ed25519', 'secp256k1'])
        expect(multiaddrs).to.exist()

        multiaddrs.forEach((m) => expect(isMultiaddr(m)).to.eql(true))

        defer.resolve()
      })

      await start(discovery)

      await defer.promise
    })

    it('should not receive a peer event before start', async () => {
      discovery.addEventListener('peer', () => {
        throw new Error('should not receive a peer event before start')
      })

      await delay(2000)
    })

    it('should not receive a peer event after stop', async () => {
      const deferStart = pDefer()

      discovery.addEventListener('peer', () => {
        deferStart.resolve()
      })

      await start(discovery)

      await deferStart.promise

      await stop(discovery)

      discovery.addEventListener('peer', () => {
        throw new Error('should not receive a peer event after stop')
      })

      await delay(2000)
    })
  })
}
