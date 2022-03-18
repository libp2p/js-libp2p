// eslint-disable-next-line
'use strict'

import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import WebSocketStar from 'libp2p-websocket-star'
import { WebRTCStar } from '@libp2p/webrtc-star'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { DelegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { DelegatedContentRouting } from '@libp2p/delegated-content-routing'

export default function Libp2pBundle ({peerInfo, peerBook}) {
  const wrtcstar = new WebRTCStar({id: peerInfo.id})
  const wsstar = new WebSocketStar({id: peerInfo.id})
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
      wsstar,
      new WebSockets()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncrypters: [
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
