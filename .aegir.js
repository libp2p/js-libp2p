'use strict'

const { Multiaddr } = require('multiaddr')
const pipe = require('it-pipe')
const WS = require('./src')

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}
let listener

async function before () {
  const ws = new WS({ upgrader: mockUpgrader })
  const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  listener = ws.createListener(conn => pipe(conn, conn))
  await listener.listen(ma)
  listener.on('error', console.error)
}

function after () {
  return listener.close()
}

module.exports = {
  test: {
    before,
    after
  }
}
