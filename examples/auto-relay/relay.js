'use strict'

const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

;(async () => {
  const node = await Libp2p.create({
    modules: {
      transport: [Websockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    },
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0/ws']
      // announceFilter: TODO check production section
    },
    config: {
      relay: {
        enabled: true,
        hop: {
          enabled: true
        },
        advertise: {
          enabled: true,
        }
      }
    }
  })

  await node.start()

  console.log(`Node started. ${node.peerId.toB58String()}`)
  console.log('Listening on:')
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
})()