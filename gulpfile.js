'use strict'

const gulp = require('gulp')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const WS = require('./src')

let listener

gulp.task('test:browser:before', (done) => {
  const ws = new WS()
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
  listener = ws.createListener((conn) => {
    pull(conn, conn)
  })
  listener.listen(ma, done)
})

gulp.task('test:browser:after', (done) => {
  listener.close(done)
})

require('aegir/gulp')(gulp)
