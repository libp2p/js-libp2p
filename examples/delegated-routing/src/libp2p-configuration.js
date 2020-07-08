// eslint-disable-next-line
'use strict'

const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const WebRTCStar = require('libp2p-webrtc-star')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const KadDHT = require('libp2p-kad-dht')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')

export default function Libp2pConfiguration ({peerId}) {
  const delegatedApiOptions = {
    protocol: 'https',
    port: 443,
    host: 'node0.delegate.ipfs.io'
  }

  return new Libp2p({
    peerId,
    // Lets limit the connection managers peers and have it check peer health less frequently
    connectionManager: {
      maxPeers: 10,
      pollInterval: 5000
    },
    modules: {
      contentRouting: [
        new DelegatedContentRouter(peerId, delegatedApiOptions)
      ],
      peerRouting: [
        new DelegatedPeerRouter(delegatedApiOptions)
      ],
      transport: [
        WebRTCStar,
        Websockets
      ],
      streamMuxer: [
        MPLEX
      ],
      connEncryption: [
        SECIO
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
