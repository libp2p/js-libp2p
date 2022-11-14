import { createLibp2p } from 'libp2p'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { createFromJSON } from '@libp2p/peer-id-factory'
import wrtc from 'wrtc'

;(async () => {
  // hardcoded peer id to avoid copy-pasting of listener's peer id into the dialer's bootstrap list
  // generated with cmd `peer-id --type=ed25519`
  const hardcodedPeerId = await createFromJSON({
    "id": "12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m",
    "privKey": "CAESQAG6Ld7ev6nnD0FKPs033/j0eQpjWilhxnzJ2CCTqT0+LfcWoI2Vr+zdc1vwk7XAVdyoCa2nwUR3RJebPWsF1/I=",
    "pubKey": "CAESIC33FqCNla/s3XNb8JO1wFXcqAmtp8FEd0SXmz1rBdfy"
  })
  const node = await createLibp2p({
    peerId: hardcodedPeerId,
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct']
    },
    transports: [new webRTCDirect({ wrtc })],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()]
  })

  node.connectionManager.addEventListener('peer:connect', (evt) => {
    console.info(`Connected to ${evt.detail.remotePeer.toString()}!`)
  })

  await node.start()

  console.log('Listening on:')
  node.getMultiaddrs().forEach((ma) => console.log(ma.toString()))
})()
