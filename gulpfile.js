'use strict'

const gulp = require('gulp')
const multiaddr = require('multiaddr')
const WSlibp2p = require('./src')

let ws

gulp.task('test:browser:before', (done) => {
  ws = new WSlibp2p()
  const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
  ws.createListener(mh, (socket) => {
    socket.pipe(socket)
  }, done)
})

gulp.task('test:browser:after', (done) => {
  ws.close(done)
})

require('aegir/gulp')(gulp)
