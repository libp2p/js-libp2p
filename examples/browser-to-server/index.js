import { createLibp2p } from 'libp2p'
import { Noise } from '@chainsafe/libp2p-noise'
import { multiaddr } from '@multiformats/multiaddr'
import first from "it-first";
import { pipe } from "it-pipe";
import { fromString, toString } from "uint8arrays";
import { webRTC } from 'js-libp2p-webrtc'

  let stream;
  const output = document.getElementById('output')
  const sendSection = document.getElementById('send-section')
  const appendOutput = (line) => output.innerText += `${line}\n`
  const clean = (line) => line.replaceAll('\n', '')

  const node = await createLibp2p({
    transports: [webRTC()],
    connectionEncryption: [() => new Noise()],
  });
  
  await node.start()

  node.connectionManager.addEventListener('peer:connect', (connection) => {
    appendOutput(`Peer connected '${node.getConnections().map(c => c.remoteAddr.toString())}'`)
    sendSection.style.display = 'block'
  })
  
  window.connect.onclick = async () => {
    const ma = multiaddr(window.peer.value)
    appendOutput(`Dialing ${ma}`)
    stream = await node.dialProtocol(ma, ['/echo/1.0.0']) 
  }
  
  window.send.onclick = async () => {
    const message = `${window.message.value}\n`
    appendOutput(`Sending message '${clean(message)}'`)
    const response = await pipe([fromString(message)], stream, async (source) => await first(source))
    const responseDecoded = toString(response.slice(0, response.length));
    appendOutput(`Received message '${clean(responseDecoded)}'`)
  }