import { createLibp2p } from 'libp2p'
import { WebRTCDirect } from '@libp2p/webrtc-direct'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { Bootstrap } from '@libp2p/bootstrap'

document.addEventListener('DOMContentLoaded', async () => {
  // use the same peer id as in `listener.js` to avoid copy-pasting of listener's peer id into `peerDiscovery`
  const hardcodedPeerId = '12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m'
  const libp2p = await createLibp2p({
    transports: [new WebRTCDirect()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    peerDiscovery: [
      new Bootstrap({
        list: [`/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/${hardcodedPeerId}`]
      })
    ]
  })

  const status = document.getElementById('status')
  const output = document.getElementById('output')

  output.textContent = ''

  function log (txt) {
    console.info(txt)
    output.textContent += `${txt.trim()}\n`
  }

  // Listen for new peers
  libp2p.addEventListener('peer:discovery', (evt) => {
    log(`Found peer ${evt.detail.id.toString()}`)

    // Dial the discovered peer
    libp2p.dial(evt.detail.id)
      .catch(err => {
        console.error(err)
      })
  })

  // Listen for new connections to peers
  libp2p.connectionManager.addEventListener('peer:connect', (evt) => {
    log(`Connected to ${evt.detail.remotePeer.toString()}`)
  })

  // Listen for peers disconnecting
  libp2p.connectionManager.addEventListener('peer:disconnect', (evt) => {
    log(`Disconnected from ${evt.detail.remotePeer.toString()}`)
  })

  await libp2p.start()
  status.innerText = 'libp2p started!'
  log(`libp2p id is ${libp2p.peerId.toString()}`)
})
