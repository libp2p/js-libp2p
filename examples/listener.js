'use strict'

const tcp = require('net')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const multiplex = require('../src')

const listener = tcp.createServer((socket) => {
  console.log('[listener] Got connection!')

  const muxer = multiplex.listener(toPull(socket))

  muxer.on('stream', (stream) => {
    console.log('[listener] Got stream!')
    pull(
      stream,
      pull.drain((data) => {
        console.log('[listener] Received:')
        console.log(data.toString())
      })
    )
  })
})

listener.listen(9999, () => {
  console.log('[listener] listening on 9999')
})
