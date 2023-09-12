/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { multiaddr } from '@multiformats/multiaddr'
import { webRTC } from '../src/index.js'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { mockRegistrar } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { stubInterface } from 'sinon-ts'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'



describe('interface-transport compliance', () => {
  tests({
    async setup () {

      const components = {
	peerId: await createEd25519PeerId(),
	registrar: mockRegistrar(),
	upgrader: mockUpgrader(),
	transportManager: stubInterface<TransportManager>()
      }

      const wrtc = webRTC()(components)
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9091/ws'),
        multiaddr('/ip4/127.0.0.1/tcp/9092/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9092/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9092/wss')
      ]

      const listeningAddrs = [
	multiaddr('/ip4/127.0.0.1/tcp/9091/ws/p2p/QmP2PWebRTC'),
      ]


      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay () { },
        restore () { }
      }

      return { transport: wrtc , addrs, connector, listeningAddrs }
    },
    async teardown () {}
  })
})