/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { multiaddr } from '@multiformats/multiaddr'
import { webRTC } from '../src/index.js'
import { connectionPair, mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { mockRegistrar } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'
import { stubInterface } from 'sinon-ts'
import type { Connection } from '@libp2p/interface/connection'
import { SIGNALING_PROTO_ID } from '../src/private-to-private/transport.js'
import { pipe } from 'it-pipe'
import drain from 'it-drain'




describe('interface-transport compliance', () => {
  tests({
    async setup() {

      const peerId = await createEd25519PeerId()

      const fakeDial = async (): Promise<Connection> => {
        // const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), peerId))
        // const newStreamStub = sinon.stub().withArgs(SIGNALING_PROTO_ID).resolves({ close: sinon.stub(), abort: sinon.stub() })

        // connection.newStream = newStreamStub

        const peerA = {
          peerId: await createEd25519PeerId(),
          registrar: mockRegistrar()
        }

        const peerB = {
          peerId: await createEd25519PeerId(),
          registrar: mockRegistrar()
        }

        await peerB.registrar.handle(SIGNALING_PROTO_ID, ({ stream }) => {
          void pipe(stream, drain)
        })

        const [connectionA] = connectionPair(peerA, peerB)

        return connectionA
      }

      const components: any = {
        peerId,
        registrar: mockRegistrar(),
        upgrader: mockUpgrader(),
        transportManager: stubInterface<TransportManager>({
          dial: fakeDial(),
        }),
      }

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