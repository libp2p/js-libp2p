const Libp2p = require('libp2p')
const Bootstrap = require('libp2p-bootstrap')
const WebRTCDirect = require('libp2p-webrtc-direct')
const Mplex = require('libp2p-mplex')
const {NOISE} = require('libp2p-noise')

;(async () => {

  const node =  await Libp2p.create({
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct']
    },
    modules: {
      transport: [WebRTCDirect],
      streamMuxer: [Mplex],
      connEncryption: [NOISE]
    },
    config: {
      peerDiscovery: {
        [Bootstrap.tag]: {
          enabled: false,
        }
      }
    }
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.info(`Connected to ${connection.remotePeer.toB58String()}!`)
  })

  await node.start()

  console.log('Listening on:')
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))

})()
