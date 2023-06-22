import { MockDiscovery } from '../../src/mocks/peer-discovery.js'
import tests from '../../src/peer-discovery/index.js'

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
