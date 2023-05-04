// eslint-disable-next-line
'use strict'

import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webRTCStar } from '@libp2p/webrtc-star'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { delegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { delegatedContentRouting } from '@libp2p/delegated-content-routing'
import { create as createIpfsHttpClient } from 'ipfs-http-client'
import { circuitRelayTransport } from 'libp2p/circuit-relay'

export default function Libp2pBundle ({peerInfo, peerBook}) {
  const wrtcstar = new webRTCStar()
  const client = createIpfsHttpClient({
    host: '0.0.0.0',
    protocol: 'http',
    port: '8080'
  })

  return createLibp2p({
    peerInfo,
    peerBook,
    // Let's limit the number of connections the connection managers can have
    connectionManager: {
      maxConnections: 10
    },
    contentRouting: [
      delegatedPeerRouting(client)
    ],
    peerRouting: [
      delegatedContentRouting(client)
    ],
    transports: [
      wrtcstar.transport,
      webSockets(),
      circuitRelayTransport()
    ],
    streamMuxers: [
      mplex()
    ],
    peerDiscovery: [
      wrtcstar.discovery
    ],
    connectionEncryption: [
      noise()
    ]
  })
}
