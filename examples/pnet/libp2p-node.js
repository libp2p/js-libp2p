import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import { preSharedKey } from 'libp2p/pnet'

/**
 * privateLibp2pNode returns a libp2p node function that will use the swarm
 * key with the given `swarmKey` to create the Protector
 *
 * @param swarmKey
 */
export async function privateLibp2pNode (swarmKey) {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()], // We're only using the TCP transport for this example
    streamMuxers: [yamux(), mplex()], // We're only using mplex muxing
    // Let's make sure to use identifying crypto in our pnet since the protector doesn't
    // care about node identity, and only the presence of private keys
    connectionEncryption: [noise()],
    // Leave peer discovery empty, we don't want to find peers. We could omit the property, but it's
    // being left in for explicit readability.
    // We should explicitly dial pnet peers, or use a custom discovery service for finding nodes in our pnet
    peerDiscovery: [],
    connectionProtector: preSharedKey({
      psk: swarmKey
    })
  })

  return node
}
