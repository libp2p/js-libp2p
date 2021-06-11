/* eslint-disable no-console */
'use strict'

const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const fs = require('fs');
const https = require('https');
const pipe = require('it-pipe')

const transportKey = WebSockets.prototype[Symbol.toStringTag];

const httpServer = https.createServer({
  cert: fs.readFileSync('./test_certs/cert.pem'),
  key: fs.readFileSync('./test_certs/key.pem'),
});

const createNode = async (addresses = []) => {
  if (!Array.isArray(addresses)) {
    addresses = [addresses]
  }

  const node = await Libp2p.create({
    addresses: {
      listen: addresses
    },
    modules: {
      transport: [WebSockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    },
    config: {
      peerDiscovery: {
        // Disable autoDial as it would fail because we are using a self-signed cert.
        // `dialProtocol` does not fail because we pass `rejectUnauthorized: false`.
        autoDial: false
      },
      transport: {
        [transportKey]: {
          listenerOptions: { server: httpServer },
        },
      },
    }
  })

  await node.start()
  return node
}

function printAddrs(node, number) {
  console.log('node %s is listening on:', number)
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
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

  const targetAddr = `${node1.multiaddrs[0]}/p2p/${node1.peerId.toB58String()}`;

  // node 2 (Secure WebSockets) dials to node 1 (Secure Websockets)
  const { stream } = await node2.dialProtocol(targetAddr, '/print',  { websocket: { rejectUnauthorized: false } })
  await pipe(
    ['node 2 dialed to node 1 successfully'],
    stream
  )
})();
