/* eslint-env mocha */

import tests from '@libp2p/interface-peer-discovery-compliance-tests'
import { multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { mdns } from '../src/index.js'
import type { AddressManager } from '@libp2p/interface-address-manager'
import { CustomEvent } from '@libp2p/interfaces/events'
import { stubInterface } from 'ts-sinon'
import type { PeerDiscovery } from '@libp2p/interface-peer-discovery'

let discovery: PeerDiscovery

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

      discovery = mdns({
        broadcast: false,
        port: 50001
      })({
        addressManager
      })

      // Trigger discovery
      const maStr = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2d'

      // @ts-expect-error not a PeerDiscovery field
      intervalId = setInterval(() => discovery._onPeer(new CustomEvent('peer', {
        detail: {
          id: peerId2,
          multiaddrs: [multiaddr(maStr)],
          protocols: []
        }
      })), 1000)

      return discovery
    },
    async teardown () {
      clearInterval(intervalId)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  })
})
