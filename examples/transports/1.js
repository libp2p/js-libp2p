'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()]
    }
    super(modules, peerInfo)
  }
}

let node

waterfall([
  (cb) => PeerInfo.create(cb),
  (peerInfo, cb) => {
    peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    node = new MyBundle(peerInfo)
    node.start(cb)
  }
], (err) => {
  if (err) { throw err }

  console.log('node has started (true/false):', node.isStarted())
  console.log('listening on:')
  node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))
})
