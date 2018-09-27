import Libp2p from 'libp2p';
import Websockets from 'libp2p-websockets';
import WebSocketStar from 'libp2p-websocket-star';
import WebRTCStar from 'libp2p-webrtc-star';
import MPLEX from 'libp2p-mplex';
import SECIO from 'libp2p-secio';
import KadDHT from 'libp2p-kad-dht';
import DelegatedPeerRouter from 'libp2p-delegated-peer-routing';
import DelegatedContentRouter from 'libp2p-delegated-content-routing';

export default ({peerInfo, peerBook}) => {
  const wrtcstar = new WebRTCStar({id: peerInfo.id});
  const wsstar = new WebSocketStar({id: peerInfo.id});
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
        SECIO
      ],
      dht: KadDHT
    },
    config: {
      peerDiscovery: {
        webrtcStar: {
          enabled: false
        },
        websocketStar: {
          enabled: false
        }
      },
      dht: {
        kBucketSize: 20
      },
      relay: {
        enabled: true,
        hop: {
          enabled: false
        }
      },
      EXPERIMENTAL: {
        dht: false
      }
    }
  })
};