// eslint-disable-next-line
'use strict'

const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const WebSocketStar = require('libp2p-websocket-star')
const WebRTCStar = require('libp2p-webrtc-star')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('@chainsafe/libp2p-noise')
const KadDHT = require('libp2p-kad-dht')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')

export default function Libp2pBundle ({peerInfo, peerBook}) {
  const wrtcstar = new WebRTCStar({id: peerInfo.id})
  const wsstar = new WebSocketStar({id: peerInfo.id})
  const delegatedApiOptions = {
    host: '0.0.0.0',
    protocol: 'http',
    port: '8080'
  }

  return new Libp2p({
    peerInfo,
    peerBook,
    // Lets limit the connection managers peers and have it check peer health less frequently
    connectionManager: {
      maxPeers: 10,
      pollInterval: 5000
    },
    modules: {
      contentRouting: [
        new DelegatedContentRouter(peerInfo.id, delegatedApiOptions)
      ],
      peerRouting: [
        new DelegatedPeerRouter(delegatedApiOptions)
      ],
      peerDiscovery: [
        wrtcstar.discovery,
        wsstar.discovery
      ],
      transport: [
        wrtcstar,
        wsstar,
        Websockets
      ],
      streamMuxer: [
        MPLEX
      ],
      connEncryption: [
        NOISE
      ],
      dht: KadDHT
    },
    config: {
      peerDiscovery: {
        autoDial: false,
        webrtcStar: {
          enabled: false
        },
        websocketStar: {
          enabled: false
        }
      },
      dht: {
        enabled: false
      },
      relay: {
        enabled: true,
        hop: {
          enabled: false
        }
      }
    }
  })
}
