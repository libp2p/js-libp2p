import 'babel-polyfill'
import Libp2p from 'libp2p'
import WebRTCStar from 'libp2p-webrtc-star'
import Secio from 'libp2p-secio'
// import Secio from 'libp2p/src/insecure/plaintext'
import Mplex from 'libp2p-mplex'

document.addEventListener('DOMContentLoaded', async () => {
  const libp2p = await Libp2p.create({
    modules: {
      transport: [WebRTCStar],
      connEncryption: [Secio],
      streamMuxer: [Mplex]
    }
  })

  // UI elements
  const status = document.getElementById('status')
  const output = document.getElementById('output')

  output.textContent = ''

  function log (txt) {
    console.info(txt)
    output.textContent += `${txt.trim()}\n`
  }

  const webrtcAddr = `/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star/p2p/${libp2p.peerInfo.id.toString()}`
  libp2p.peerInfo.multiaddrs.add(webrtcAddr)

  libp2p.on('peer:discovery', (peerInfo) => {
    log(`Found peer ${peerInfo.id.toB58String()}`)
  })

  libp2p.on('peer:connect', (peerInfo) => {
    log(`Connected to ${peerInfo.id.toB58String()}`)
  })

  libp2p.on('peer:disconnect', (peerInfo) => {
    log(`Disconnected from ${peerInfo.id.toB58String()}`)
  })

  await libp2p.start()
  status.innerText = 'libp2p started!'
  log(`libp2p id is ${libp2p.peerInfo.id.toB58String()}`)

  window.libp2p = libp2p
})