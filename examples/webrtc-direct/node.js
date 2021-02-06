const Libp2p = require('libp2p')
const IPFS = require('ipfs')
const Bootstrap = require('libp2p-bootstrap')
const WebRTCDirect = require('libp2p-webrtc-direct')
const Mplex = require('libp2p-mplex')
const {NOISE} = require('libp2p-noise')

const libp2pBundle = (opts) => {
  const peerId = opts.peerId

  return new Libp2p({
    peerId,
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
}

async function main () {
  const node = await IPFS.create({
    repo: 'ipfs-' + Math.random(),
    libp2p: libp2pBundle
  })
  console.log(`ipfs node's config: ${JSON.stringify(await node.id())}`)

  const interval = setInterval(async () => {
    try {
      const peers = await node.swarm.peers()
      if (peers.length > 0) {
        console.log(`The node now has ${peers.length} peers.`)
        console.log(`peers: ${JSON.stringify(peers, null, 2)}`)
        clearInterval(interval)
      }
    } catch (err) {
      console.log('An error occurred trying to check out peers:', err)
    }
  }, 2000)
}

main()
