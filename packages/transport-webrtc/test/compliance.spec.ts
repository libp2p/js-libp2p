/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { multiaddr } from '@multiformats/multiaddr'
import { webRTC } from '../src/index.js'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { mockRegistrar } from '@libp2p/interface-compliance-tests/mocks'
import { mockTransportManager } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { EventEmitter } from '@libp2p/interface/events'
import type { Libp2pEvents } from '@libp2p/interface'

describe('interface-transport compliance', () => {
  tests({
    async setup() {

      const events = new EventEmitter<Libp2pEvents>()

      const components: any = {
        peerId: await createEd25519PeerId(),
        registrar: mockRegistrar(),
        upgrader: mockUpgrader()
      }

      components.transportManager = mockTransportManager({ ...components, events })

      components.transportManager.add(webRTC()(components))

      const wrtc = webRTC()(components)
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9091/ws'),
        multiaddr('/ip4/127.0.0.1/tcp/9092/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9092/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9092/ws')
      ]

      const listeningAddrs = [
        multiaddr('/ip4/127.0.0.1/tcp/57708/ws/p2p/12D3KooWRqAUEzPwKMoGstpfJVqr3aoinwKVPu4DLo9nQncbnuLk/p2p-circuit/p2p/12D3KooWBZyVLJfQkofqLK4op9TPkHuUumCZt1ybQrPvNm7TVQV9/p2p-circuit/webrtc/p2p/12D3KooWBZyVLJfQkofqLK4op9TPkHuUumCZt1ybQrPvNm7TVQV9'),
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay() { },
        restore() { }
      }

      return { transport: wrtc, addrs, connector, listeningAddrs }
    },
    async teardown() { }
  })
})