import tests from '@libp2p/interface-compliance-tests/transport'
import { memory } from '@libp2p/memory'
import { multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'

describe('memory transport interface compliance tests', () => {
  tests({
    async setup () {
      const transport = memory()
      const dialAddrs: [Multiaddr, Multiaddr] = [
        multiaddr('/memory/addr-1'),
        multiaddr('/memory/addr-2')
      ]

      return { transport, dialAddrs }
    },
    async teardown () {}
  })
})
