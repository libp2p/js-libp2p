import tests from '@libp2p/interface-peer-discovery-compliance-tests'
import { MockDiscovery } from '../src/peer-discovery.js'

describe('mock peer discovery compliance tests', () => {
  let intervalId: any

  tests({
    async setup () {
      const mockDiscovery = new MockDiscovery({
        discoveryDelay: 1
      })

      intervalId = setInterval(mockDiscovery._discoverPeer, 1000)

      return mockDiscovery
    },
    async teardown () {
      clearInterval(intervalId)
    }
  })
})
