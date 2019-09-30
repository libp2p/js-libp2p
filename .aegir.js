'use strict'

const multiaddr = require('multiaddr')
const pipe = require('it-pipe')
const WS = require('./src')

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}
let listener

function boot (done) {
  const ws = new WS({ upgrader: mockUpgrader })
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  listener = ws.createListener(conn => pipe(conn, conn))
  listener.listen(ma).then(() => done()).catch(done)
  listener.on('error', console.error)
}

function shutdown (done) {
  listener.close().then(done).catch(done)
}

module.exports = {
  hooks: {
    browser: {
      pre: boot,
      post: shutdown
    }
  }
}
