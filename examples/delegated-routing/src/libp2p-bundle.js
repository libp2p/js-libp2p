// eslint-disable-next-line
'use strict'

import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { WebRTCStar } from '@libp2p/webrtc-star'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { DelegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { DelegatedContentRouting } from '@libp2p/delegated-content-routing'

export default function Libp2pBundle ({peerInfo, peerBook}) {
  const wrtcstar = new WebRTCStar()
  const delegatedApiOptions = {
    host: '0.0.0.0',
    protocol: 'http',
    port: '8080'
  }

  return createLibp2p({
    peerInfo,
    peerBook,
    // Lets limit the connection managers peers and have it check peer health less frequently
    connectionManager: {
      maxPeers: 10,
      pollInterval: 5000
    },
    contentRouting: [
      new DelegatedPeerRouting(peerInfo.id, delegatedApiOptions)
    ],
    peerRouting: [
      new DelegatedContentRouting(delegatedApiOptions)
    ],
    transports: [
      wrtcstar,
      new WebSockets()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Noise()
    ],
    connectionManager: {
      autoDial: false
    },
    relay: {
      enabled: true,
      hop: {
        enabled: false
      }
    }
  })
}
