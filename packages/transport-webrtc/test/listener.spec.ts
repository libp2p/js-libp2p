import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { WebRTCPeerListener } from '../src/private-to-private/listener.js'
import type { Listener } from '@libp2p/interface/transport'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

describe('webrtc private-to-private listener', () => {
  it('should only return relay addresses as webrtc listen addresses', async () => {
    const relayedAddress = '/ip4/127.0.0.1/tcp/4034/ws/p2p-circuit'
    const otherListenAddress = '/ip4/127.0.0.1/tcp/4001'
    const peerId = await createEd25519PeerId()
    const transportManager = stubInterface<TransportManager>()

    const listener = new WebRTCPeerListener({
      peerId,
      transportManager
    })

    const otherListener = stubInterface<Listener>({
      getAddrs: [multiaddr(otherListenAddress)]
    })

    const relayListener = stubInterface<Listener>({
      getAddrs: [multiaddr(relayedAddress)]
    })

    transportManager.getListeners.returns([
      listener,
      otherListener,
      relayListener
    ])

    const addresses = listener.getAddrs()

    expect(addresses.map(ma => ma.toString())).to.deep.equal([
      `${relayedAddress}/webrtc/p2p/${peerId}`
    ])
  })
})
