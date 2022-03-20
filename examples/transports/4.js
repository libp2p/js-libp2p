/* eslint-disable no-console */

import { createLibp2p } from '../../../dist/src/index.js'
import { TCP } from '@libp2p/tcp'
import { WebSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'
import fs from 'fs'
import https from 'https'
import { pipe } from 'it-pipe'

const httpServer = https.createServer({
  cert: fs.readFileSync('./test_certs/cert.pem'),
  key: fs.readFileSync('./test_certs/key.pem'),
});

const createNode = async (addresses = []) => {
  if (!Array.isArray(addresses)) {
    addresses = [addresses]
  }

  const node = await createLibp2p({
    addresses: {
      listen: addresses
    },
    transports: [
      new TCP(),
      new WebSockets({
        server: httpServer
      })
    ],
    connectionEncryption: [new Noise()],
    streamMuxers: [new Mplex()],
    connectionManager: {
      // Disable autoDial as it would fail because we are using a self-signed cert.
      // `dialProtocol` does not fail because we pass `rejectUnauthorized: false`.
      autoDial: false
    }
  })

  await node.start()
  return node
}

function printAddrs(node, number) {
  console.log('node %s is listening on:', number)
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toString()}`))
}

function print ({ stream }) {
  pipe(
    stream,
    async function (source) {
      for await (const msg of source) {
        console.log(msg.toString())
      }
    }
  )
}

;(async () => {
  const [node1, node2] = await Promise.all([
    createNode('/ip4/127.0.0.1/tcp/10000/wss'),
    createNode([])
  ])

  printAddrs(node1, '1')
  printAddrs(node2, '2')

  node1.handle('/print', print)
  node2.handle('/print', print)

  const targetAddr = `${node1.multiaddrs[0]}/p2p/${node1.peerId.toString()}`;

  // node 2 (Secure WebSockets) dials to node 1 (Secure Websockets)
  const { stream } = await node2.dialProtocol(targetAddr, '/print',  { websocket: { rejectUnauthorized: false } })
  await pipe(
    ['node 2 dialed to node 1 successfully'],
    stream
  )
})();
