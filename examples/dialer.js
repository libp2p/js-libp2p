'use strict'

const tcp = require('net')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const multiplex = require('../src')

const socket = tcp.connect(9999)

const muxer = multiplex.dialer(toPull(socket))

console.log('[dialer] opening stream')
const stream = muxer.newStream((err) => {
  console.log('[dialer] opened stream')
  if (err) throw err
})

pull(
  pull.values(['hey, how is it going. I am the dialer']),
  stream
)
