import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { WebRTCPeerListener } from '../src/private-to-private/listener.js'
import type { Listener } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

describe('webrtc private-to-private listener', () => {
  it('should only return relay addresses as webrtc listen addresses', async () => {
    const relayedAddress = '/ip4/127.0.0.1/tcp/4034/ws/p2p-circuit'
    const otherListenAddress = '/ip4/127.0.0.1/tcp/4001'
    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const transportManager = stubInterface<TransportManager>()

    const listener = new WebRTCPeerListener({
      peerId,
      transportManager,
      events: new TypedEventEmitter()
    }, {
      shutdownController: new AbortController()
    })

    const otherListener = stubInterface<Listener>({
      getAddrs: Sinon.stub().returns([multiaddr(otherListenAddress)])
    })

    const relayListener = stubInterface<Listener>({
      getAddrs: Sinon.stub().returns([multiaddr(relayedAddress)])
    })

    transportManager.getListeners.returns([
      listener,
      otherListener,
      relayListener
    ])

    const addresses = listener.getAddrs()

    expect(addresses.map(ma => ma.toString())).to.deep.equal([
      `${relayedAddress}/webrtc`
    ])
  })
})
