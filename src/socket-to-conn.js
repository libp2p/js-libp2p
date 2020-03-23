'use strict'

const { Buffer } = require('buffer')
const abortable = require('abortable-iterator')
const { CLOSE_TIMEOUT } = require('./constants')
const toMultiaddr = require('libp2p-utils/src/ip-port-to-multiaddr')

const pTimeout = require('p-timeout')

const debug = require('debug')
const log = debug('libp2p:websockets:socket')
log.error = debug('libp2p:websockets:socket:error')

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
module.exports = (stream, options = {}) => {
  const maConn = {
    async sink (source) {
      if (options.signal) {
        source = abortable(source, options.signal)
      }

      try {
        await stream.sink((async function * () {
          for await (const chunk of source) {
            // Convert BufferList to Buffer
            yield Buffer.isBuffer(chunk) ? chunk : chunk.slice()
          }
        })())
      } catch (err) {
        if (err.type !== 'aborted') {
          log.error(err)
        }
      }
    },

    source: options.signal ? abortable(stream.source, options.signal) : stream.source,

    conn: stream,

    localAddr: options.localAddr || (stream.localAddress && stream.localPort
      ? toMultiaddr(stream.localAddress, stream.localPort) : undefined),

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr: options.remoteAddr || toMultiaddr(stream.remoteAddress, stream.remotePort),

    timeline: { open: Date.now() },

    async close () {
      const start = Date.now()

      try {
        await pTimeout(stream.close(), CLOSE_TIMEOUT)
      } catch (err) {
        const { host, port } = maConn.remoteAddr.toOptions()
        log('timeout closing stream to %s:%s after %dms, destroying it manually',
          host, port, Date.now() - start)

        stream.destroy()
      } finally {
        maConn.timeline.close = Date.now()
      }
    }
  }

  stream.socket.once && stream.socket.once('close', () => {
    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (!maConn.timeline.close) {
      maConn.timeline.close = Date.now()
    }
  })

  return maConn
}
