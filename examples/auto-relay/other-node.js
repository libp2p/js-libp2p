'use strict'

const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const autoRelayNodeAddr = process.argv[2]
if (!autoRelayNodeAddr) {
  throw new Error('the auto relay node address needs to be specified')
}

;(async () => {
  const node = await Libp2p.create({
    modules: {
      transport: [Websockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    }
  })

  await node.start()
  console.log(`Node started: ${node.peerId.toB58String()}`)

  const conn = await node.dial(autoRelayNodeAddr)
  console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
})()