import { createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { multiaddr } from '@multiformats/multiaddr'
import { pipe } from "it-pipe";
import { fromString, toString } from "uint8arrays";
import { webRTCDirect } from '@libp2p/webrtc'
import { pushable } from 'it-pushable';

let stream;
const output = document.getElementById('output')
const sendSection = document.getElementById('send-section')
const appendOutput = (line) => {
  const div = document.createElement("div")
  div.appendChild(document.createTextNode(line))
  output.append(div)
}
const clean = (line) => line.replaceAll('\n', '')
const sender = pushable()

const node = await createLibp2p({
  transports: [webRTCDirect()],
  connectionEncryption: [noise()],
});

await node.start()

node.connectionManager.addEventListener('peer:connect', (connection) => {
  appendOutput(`Peer connected '${node.getConnections().map(c => c.remoteAddr.toString())}'`)
  sendSection.style.display = 'block'
})

window.connect.onclick = async () => {


  // TODO!!(ckousik): hack until webrtc is renamed in Go. Remove once
  // complete
  let candidateMa = window.peer.value
  candidateMa = candidateMa.replace(/\/webrtc\/certhash/, "/webrtc-direct/certhash")
  const ma = multiaddr(candidateMa)


  appendOutput(`Dialing '${ma}'`)
  stream = await node.dialProtocol(ma, ['/echo/1.0.0'])
  pipe(sender, stream, async (src) => {
    for await(const buf of src) {
      const response = toString(buf.subarray())
      appendOutput(`Received message '${clean(response)}'`)
    }
  })
}

window.send.onclick = async () => {
  const message = `${window.message.value}\n`
  appendOutput(`Sending message '${clean(message)}'`)
  sender.push(fromString(message))
}
