'use strict'

const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const WS = require('./src')

let listener

function boot (done) {
  const ws = new WS()
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  listener = ws.createListener((conn) => pull(conn, conn))
  listener.listen(ma, done)
}

function shutdown (done) {
  listener.close(done)
}

module.exports = {
  hooks: {
    browser: {
      pre: boot,
      post: shutdown
    }
  }
}
