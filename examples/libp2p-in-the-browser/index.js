import { createLibp2p } from 'libp2p'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import { kadDHT } from '@libp2p/kad-dht'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { webRTCDirect, webRTC } from '@libp2p/webrtc'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'

document.addEventListener('DOMContentLoaded', async () => {
  // Create our libp2p node
  const libp2p = await createLibp2p({
    // transports allow us to dial peers that support certain types of addresses
    transports: [
      webSockets(),
      webTransport(),
      webRTC(),
      webRTCDirect(),
      circuitRelayTransport({
        // use content routing to find a circuit relay server we can reserve a
        // slot on
        discoverRelays: 1
      })
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux(), mplex()],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
        ]
      })
    ],
    services: {
      // the identify service is used by the DHT and the circuit relay transport
      // to find peers that support the relevant protocols
      identify: identifyService(),

      // the DHT is used to find circuit relay servers we can reserve a slot on
      dht: kadDHT({
        // browser node ordinarily shouldn't be DHT servers
        clientMode: true
      })
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

  // Listen for new peers
  libp2p.addEventListener('peer:discovery', (evt) => {
    const peerInfo = evt.detail
    log(`Found peer ${peerInfo.id.toString()}`)

    // dial them when we discover them
    libp2p.dial(peerInfo.id).catch(err => {
      log(`Could not dial ${peerInfo.id.toString()}`, err)
    })
  })

  // Listen for new connections to peers
  libp2p.addEventListener('peer:connect', (evt) => {
    const peerId = evt.detail
    log(`Connected to ${peerId.toString()}`)
  })

  // Listen for peers disconnecting
  libp2p.addEventListener('peer:disconnect', (evt) => {
    const peerId = evt.detail
    log(`Disconnected from ${peerId.toString()}`)
  })

  status.innerText = 'libp2p started!'
  log(`libp2p id is ${libp2p.peerId.toString()}`)

  // Export libp2p to the window so you can play with the API
  window.libp2p = libp2p
})
