import tests from '@libp2p/interface-compliance-tests/transport'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { isBrowser, isWebWorker } from 'wherearewe'
import type { Multiaddr } from '@multiformats/multiaddr'

describe('tcp transport interface compliance IPv4', () => {
  if (isBrowser || isWebWorker) {
    return
  }

  tests({
    async setup () {
      const transport = tcp()
      const dialAddrs: [Multiaddr, Multiaddr] = [
        multiaddr('/ip4/127.0.0.1/tcp/9091'),
        multiaddr('/ip4/127.0.0.1/tcp/9092')
      ]

      return { transport, dialAddrs }
    },
    async teardown () {}
  })
})

describe('tcp transport interface compliance IPv6', () => {
  if (isBrowser || isWebWorker) {
    return
  }

  tests({
    async setup () {
      const transport = tcp()
      const dialAddrs: [Multiaddr, Multiaddr] = [
        multiaddr('/ip6/::/tcp/9093'),
        multiaddr('/ip6/::/tcp/9094')
      ]

      return { transport, dialAddrs }
    },
    async teardown () {}
  })
})
