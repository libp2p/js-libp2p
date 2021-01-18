'use strict'

const Libp2p = require('../../../src')
const Envelope = require('../../../src/record/envelope')
const PeerRecord = require('../../../src/record/peer-record')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const multiaddr = require('multiaddr')

async function main () {
  const rendezvousServerAddr = process.argv[2]
  if (!rendezvousServerAddr) {
    throw new Error('the rendezvous server address needs to be specified as a parameter')
  }

  const rendezvousServerMultiaddr = multiaddr(rendezvousServerAddr)
  const ns = 'example-namespace'

  const node = await Libp2p.create({
    modules: {
      transport: [Websockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    },
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0/ws']
    },
    rendezvous: {
      enabled: true,
      rendezvousPoints: [rendezvousServerMultiaddr]
    }
  })

  await node.start()
  console.log(`Node started with id ${node.peerId.toB58String()}`)

  for await (const reg of node.rendezvous.discover(ns)) {
    const e = await Envelope.openAndCertify(reg.signedPeerRecord, PeerRecord.DOMAIN)
    const rec = PeerRecord.createFromProtobuf(e.payload)

    console.log(`Discovered peer with id: ${rec.peerId.toB58String()} and multiaddrs ${rec.multiaddrs}`)
  }
}

main()
