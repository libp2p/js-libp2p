import 'babel-polyfill'
import Libp2p from 'libp2p'
import Websockets from 'libp2p-websockets'
import WebRTCStar from 'libp2p-webrtc-star'
import Secio from 'libp2p-secio'
import Mplex from 'libp2p-mplex'
import Boostrap from 'libp2p-bootstrap'
import pipe from 'it-pipe'
import pushable from 'it-pushable'

document.addEventListener('DOMContentLoaded', async () => {
  // Create our libp2p node
  const libp2p = await Libp2p.create({
    modules: {
      transport: [Websockets, WebRTCStar],
      connEncryption: [Secio],
      streamMuxer: [Mplex],
      peerDiscovery: [Boostrap]
    },
    config: {
      peerDiscovery: {
        bootstrap: {
          enabled: true,
          list: [
            '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
            '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
            '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
            '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
            '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
            '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64'
          ]
        }
      }
    }
  })

  // Our protocol identifier
  const protocol = '/chat'

  // UI elements
  const status = document.getElementById('status')
  const output = document.getElementById('output')
  const txtSend = document.getElementById('txt_send')

  output.textContent = ''

  function log (txt) {
    console.info(txt)
    output.textContent += `${txt.trim()}\n`
  }

  // Add the signaling server address, along with our PeerId to our multiaddrs list
  // libp2p will automatically attempt to dial to the signaling server so that it can
  // receive inbound connections from other peers
  const webrtcAddr = '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star'
  libp2p.peerInfo.multiaddrs.add(webrtcAddr)

  // Listen for new peers
  libp2p.on('peer:discovery', peerInfo => {
    log(`Found peer ${peerInfo.id.toB58String()}`)
  })

  // Listen for new connections to peers
  let queuedMessages = pushable()
  libp2p.on('peer:connect', peerInfo => {
    log(`Connected to ${peerInfo.id.toB58String()}`)
    libp2p.dialProtocol(peerInfo, [protocol]).then(({ stream }) => {
      log('dialed a stream', stream)
      pipe(queuedMessages, stream)
    })
  })

  // Listen for peers disconnecting
  libp2p.on('peer:disconnect', peerInfo => {
    log(`Disconnected from ${peerInfo.id.toB58String()}`)
  })

  await libp2p.start()
  status.innerText = 'libp2p started!'
  log(`libp2p id is ${libp2p.peerInfo.id.toB58String()}`)

  let handledStream = null
  await libp2p.handle([protocol], ({ connection, stream }) => {
    log(`handle chat from ${connection.remotePeer.toB58String()}`)
    handledStream = stream
    pipe(handledStream, async function (source) {
      for await (const msg of source) {
        log(`Received message: ${msg}`)
      }
    })
  })

  function send () {
    const value = txtSend.value
    queuedMessages.push(value)
  }

  // Export libp2p and send to the window so you can play with the API
  window.libp2p = libp2p
  window.send = send
})
