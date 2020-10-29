'use strict'

const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const pWaitFor = require('p-wait-for')

// TODO: get the relay address from the previous step)
const relayAddr = '/ip4/192.168.1.120/tcp/61470/ws/p2p/Qme1DfXDeaMEPNsUrG8EFXj2JDqzpgy9LuD6mpqpBsNwTm'
if (!relayAddr) {
  throw new Error('the relay address needs to be specified')
}

; (async () => {
  const node = await Libp2p.create({
    modules: {
      transport: [Websockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    },
    config: {
      relay: {
        enabled: true,
        autoRelay: {
          enabled: true,
          maxListeners: 2
        }
      }
    }
  })

  await node.start()
  console.log(`Node started. ${node.peerId.toB58String()}`)

  await node.dial(relayAddr)

  // Wait for connection and relay to be bind
  await pWaitFor(() => node.multiaddrs.length > 0)

  console.log('connected to the HOP relay')
  console.log('Listening on:')
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
})()
