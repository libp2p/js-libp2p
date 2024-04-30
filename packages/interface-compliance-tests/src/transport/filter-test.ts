import { expect } from 'aegir/chai'
import type { TransportTestFixtures } from './index.js'
import type { TestSetup } from '../index.js'
import type { Transport } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export default (common: TestSetup<TransportTestFixtures>): void => {
  describe('filter', () => {
    let listenAddrs: Multiaddr[]
    let dialAddrs: Multiaddr[]
    let transport: Transport

    before(async () => {
      ({ listenAddrs, dialAddrs, transport } = await common.setup())
    })

    after(async () => {
      await common.teardown()
    })

    it('filters listen addresses', () => {
      const filteredAddrs = transport.listenFilter(listenAddrs)
      expect(filteredAddrs).to.eql(listenAddrs)
    })

    it('filters dial addresses', () => {
      const filteredAddrs = transport.dialFilter(dialAddrs)
      expect(filteredAddrs).to.eql(dialAddrs)
    })
  })
}
