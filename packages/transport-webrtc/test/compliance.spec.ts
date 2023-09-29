/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { multiaddr } from '@multiformats/multiaddr'
import { connectionPair, mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { mockRegistrar } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'
import { stubInterface } from 'sinon-ts'
import type { Connection } from '@libp2p/interface/connection'
import { SIGNALING_PROTO_ID, WebRTCTransport } from '../src/private-to-private/transport.js'
import { pipe } from 'it-pipe'

describe('interface-transport compliance', () => {
  tests({
    async setup() {

      const peerAId = await createEd25519PeerId()
      const peerBId = await createEd25519PeerId()

      const fakeDial = async (peerA: any): Promise<Connection> => {
        const peerB = {
          peerId: peerBId,
          registrar: mockRegistrar(),
          upgrader: mockUpgrader()
        }

        await peerB.registrar.handle(SIGNALING_PROTO_ID, ({ stream }) => {
          void pipe(stream, stream)
        })

        const [_, connectionToB] = connectionPair(peerA, peerB)

        return connectionToB
      }

      const peerA: any = {
        peerId: peerAId,
        registrar: mockRegistrar(),
        upgrader: mockUpgrader(),
      }

      peerA.transportManager = stubInterface<TransportManager>({
        dial: fakeDial(peerA),
      })

      const wrtc = new WebRTCTransport(peerA)

      await wrtc.start()

      const addrs = [
        multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      ]

      const listeningAddrs = [
        multiaddr(`/ip4/127.0.0.1/tcp/57708/ws/p2p/12D3KooWRqAUEzPwKMoGstpfJVqr3aoinwKVPu4DLo9nQncbnuLk/p2p-circuit/p2p/${peerBId}/p2p-circuit/webrtc/p2p/${peerBId}`),
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