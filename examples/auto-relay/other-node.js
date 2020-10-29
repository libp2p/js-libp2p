'use strict'

const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

;(async () => {
  // TODO: get the auto relay address from the previous step
  const autoRelayNodeAddr = '/ip4/192.168.1.120/tcp/61470/ws/p2p/Qme1DfXDeaMEPNsUrG8EFXj2JDqzpgy9LuD6mpqpBsNwTm/p2p-circuit/p2p/Qmch46oemLTk6HJX1Yzm8gVRLPvBStoMQNniB37mX34RqM'
  if (!autoRelayNodeAddr) {
    throw new Error('the auto relay node address needs to be specified')
  }

  const node = await Libp2p.create({
    modules: {
      transport: [Websockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    }
  })

  await node.start()

  const conn = await node.dial(autoRelayNodeAddr)
  console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
})()