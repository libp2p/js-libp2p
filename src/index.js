'use strict'

const multiplex = require('multiplex')
const toStream = require('pull-stream-to-stream')

const MULTIPLEX_CODEC = require('./multiplex-codec')
const Muxer = require('./muxer')

const pump = require('pump')

function create (rawConn, isListener) {
  const stream = toStream(rawConn)

  stream.on('end', () => {
    // Cleanup and destroy the connection when it ends
    // as the converted stream doesn't emit 'close'
    // but .destroy will trigger a 'close' event.
    stream.destroy()
  })

  const mpx = multiplex()
  pump(stream, mpx, stream)

  return new Muxer(rawConn, mpx, isListener)
}

exports = module.exports = create
exports.multicodec = MULTIPLEX_CODEC
exports.dialer = (conn) => create(conn, false)
exports.listener = (conn) => create(conn, true)
