/* eslint-env mocha */

import tests from '@libp2p/interface-peer-discovery-compliance-tests'
import { multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { MulticastDNS } from '../src/index.js'
import type { AddressManager } from '@libp2p/interface-address-manager'
import { CustomEvent } from '@libp2p/interfaces/events'
import { Components } from '@libp2p/components'
import { stubInterface } from 'ts-sinon'

let mdns: MulticastDNS

describe('compliance tests', () => {
  let intervalId: ReturnType<typeof setInterval>

  tests({
    async setup () {
      const peerId1 = await createEd25519PeerId()
      const peerId2 = await createEd25519PeerId()

      const addressManager = stubInterface<AddressManager>()
      addressManager.getAddresses.returns([
        multiaddr(`/ip4/127.0.0.1/tcp/13921/p2p/${peerId1.toString()}`)
      ])

      mdns = new MulticastDNS({
        broadcast: false,
        port: 50001,
        compat: true
      })
      mdns.init(new Components({
        peerId: peerId1,
        addressManager
      }))

      // Trigger discovery
      const maStr = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2d'
      intervalId = setInterval(() => mdns._onPeer(new CustomEvent('peer', {
        detail: {
          id: peerId2,
          multiaddrs: [multiaddr(maStr)],
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
