import { createLibp2p } from 'libp2p'
import { WebRTCDirect } from '@libp2p/webrtc-direct'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'


;(async () => {
  // hardcoded peer id to avoid copy-pasting of listener's peer id into the dialer's bootstrap list
  // generated with cmd `peer-id --type=ed25519`
  const hardcodedPeerId = await PeerId.createFromJSON({
    "id": "12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m",
    "privKey": "CAESQAG6Ld7ev6nnD0FKPs033/j0eQpjWilhxnzJ2CCTqT0+LfcWoI2Vr+zdc1vwk7XAVdyoCa2nwUR3RJebPWsF1/I=",
    "pubKey": "CAESIC33FqCNla/s3XNb8JO1wFXcqAmtp8FEd0SXmz1rBdfy"
  })
  const node = await createLibp2p({
    peerId: hardcodedPeerId,
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct']
    },
    transport: [new WebRTCDirect()],
    streamMuxers: [new Mplex()],
    connectionEncrypters: [new Noise()]
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.info(`Connected to ${connection.remotePeer.toB58String()}!`)
  })

  await node.start()

  console.log('Listening on:')
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
})()
