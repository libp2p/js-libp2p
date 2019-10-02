'use strict'

const TransportManager = require('./src/transport-manager')
const mockUpgrader = require('./test/utils/mockUpgrader')
const { MULTIADDRS_WEBSOCKETS } = require('./test/fixtures/browser')
let tm

const WebSockets = require('libp2p-websockets')

const before = async () => {
  tm = new TransportManager({
    upgrader: mockUpgrader,
    onConnection: () => {}
  })
  tm.add(WebSockets.prototype[Symbol.toStringTag], WebSockets)
  await tm.listen(MULTIADDRS_WEBSOCKETS)
}

const after = async () => {
  await tm.close()
}

module.exports = {
  bundlesize: { maxSize: '220kB' },
  hooks: {
    pre: before,
    post: after
  }
}
