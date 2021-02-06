const Libp2p = require('libp2p')
const WebRTCDirect = require('libp2p-webrtc-direct')
const Mplex = require('libp2p-mplex')
const {NOISE} = require('libp2p-noise')
const Bootstrap = require('libp2p-bootstrap')

document.addEventListener('DOMContentLoaded', async () => {
  const node = await Libp2p.create({
    modules: {
      transport: [WebRTCDirect],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      peerDiscovery: [Bootstrap]
    },
    config: {
      peerDiscovery: {
        [Bootstrap.tag]: {
          enabled: true,
          list: ['/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/QmS4W12SAA4yLxy4YwhQaJZqY82wyYLqJjhuZYSe5f2SKj']
        }
      }
    }
  })


  // Listen for new peers
  node.on('peer:discovery', (peerId) => {
    console.log(`Found peer ${peerId.toB58String()}`)
  })

  // Listen for new connections to peers
  node.connectionManager.on('peer:connect', (connection) => {
    console.log(`Connected to ${connection.remotePeer.toB58String()}`)
  })

  // Listen for peers disconnecting
  node.connectionManager.on('peer:disconnect', (connection) => {
    console.log(`Disconnected from ${connection.remotePeer.toB58String()}`)
  })

  await node.start()
})
