'use strict'

const multiaddr = require('multiaddr')
const pipe = require('it-pipe')
const WS = require('./src')

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}
let listener

async function boot () {
  const ws = new WS({ upgrader: mockUpgrader })
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  listener = ws.createListener(conn => pipe(conn, conn))
  await listener.listen(ma)
  listener.on('error', console.error)
}

function shutdown () {
  return listener.close()
}

module.exports = {
  hooks: {
    browser: {
      pre: boot,
      post: shutdown
    }
  }
}
