'use strict'

const Libp2p = require('../../../src')
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
  console.log('Node listening on:')
  node.multiaddrs.forEach((m) => console.log(`${m}/p2p/${node.peerId.toB58String()}`))

  await node.rendezvous.register(ns)
  console.log('Registered to: ', ns)
}

main()
