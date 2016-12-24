'use strict'

const gulp = require('gulp')
const WSlibp2p = require('libp2p-websockets')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const multiplex = require('./src')

let listener

gulp.task('test:browser:before', (done) => {
  const ws = new WSlibp2p()
  const mh = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  listener = ws.createListener((transportSocket) => {
    const muxedConn = multiplex.listener(transportSocket)
    muxedConn.on('stream', (connRx) => {
      const connTx = muxedConn.newStream()
      pull(connRx, connTx, connRx)
    })
  })

  listener.listen(mh, done)
})

gulp.task('test:browser:after', (done) => {
  listener.close(done)
})

require('aegir/gulp')(gulp)
