'use strict'

const abortable = require('abortable-iterator')
const { CLOSE_TIMEOUT } = require('./constants')
const toMultiaddr = require('libp2p-utils/src/ip-port-to-multiaddr')

const pTimeout = require('p-timeout')

const debug = require('debug')
const log = debug('libp2p:websockets:socket')
log.error = debug('libp2p:websockets:socket:error')

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
module.exports = (socket, options = {}) => {
  const maConn = {
    async sink (source) {
      if (options.signal) {
        source = abortable(source, options.signal)
      }

      try {
        await socket.sink((async function * () {
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

    source: options.signal ? abortable(socket.source, options.signal) : socket.source,

    conn: socket,

    localAddr: options.localAddr || (socket.localAddress && socket.localPort
      ? toMultiaddr(socket.localAddress, socket.localPort) : undefined),

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr: options.remoteAddr || toMultiaddr(socket.remoteAddress, socket.remotePort),

    timeline: { open: Date.now() },

    async close () {
      const start = Date.now()

      try {
        await pTimeout(socket.close(), CLOSE_TIMEOUT)
      } catch (err) {
        const { host, port } = maConn.remoteAddr.toOptions()
        log('timeout closing socket to %s:%s after %dms, destroying it manually',
          host, port, Date.now() - start)

        socket.destroy()
      } finally {
        maConn.timeline.close = Date.now()
      }
    }
  }

  return maConn
}
