'use strict'

const abortable = require('abortable-iterator')
const log = require('debug')('libp2p:circuit:stream')

// Convert a duplex iterable into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
module.exports = ({ stream, remoteAddr, localAddr }, options = {}) => {
  const { sink, source } = stream
  const maConn = {
    async sink (source) {
      if (options.signal) {
        source = abortable(source, options.signal)
      }

      try {
        await sink(source)
      } catch (err) {
        // If aborted we can safely ignore
        if (err.type !== 'aborted') {
          // If the source errored the socket will already have been destroyed by
          // toIterable.duplex(). If the socket errored it will already be
          // destroyed. There's nothing to do here except log the error & return.
          log(err)
        }
      }
      close()
    },

    source: options.signal ? abortable(source, options.signal) : source,
    conn: stream,
    localAddr,
    remoteAddr,
    timeline: { open: Date.now() },

    close () {
      sink([])
      close()
    }
  }

  function close () {
    if (!maConn.timeline.close) {
      maConn.timeline.close = Date.now()
    }
  }

  return maConn
}
