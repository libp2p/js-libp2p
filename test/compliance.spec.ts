/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/peer-discovery'
import { Multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { MulticastDNS } from '../src/index.js'
import { CustomEvent } from '@libp2p/interfaces'

let mdns: MulticastDNS

describe('compliance tests', () => {
  let intervalId: NodeJS.Timer

  tests({
    async setup () {
      const peerId1 = await createEd25519PeerId()
      const peerId2 = await createEd25519PeerId()

      mdns = new MulticastDNS({
        peerId: peerId1,
        multiaddrs: [],
        broadcast: false,
        port: 50001,
        compat: true
      })

      // Trigger discovery
      const maStr = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2d'
      intervalId = setInterval(() => mdns._onPeer(new CustomEvent('peer', {
        detail: {
          id: peerId2,
          multiaddrs: [new Multiaddr(maStr)],
          protocols: []
        }
      })), 1000)

      return mdns
    },
    async teardown () {
      clearInterval(intervalId)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  })
})
