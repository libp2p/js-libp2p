'use strict'

const { source: abortable } = require('abortable-iterator')
const debug = require('debug')
const log = debug('libp2p:stream:converter')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 *
 * @typedef {Object} Timeline
 * @property {number} open - connection opening timestamp.
 * @property {number} [upgraded] - connection upgraded timestamp.
 * @property {number} [close]
 */

/**
 * Convert a duplex iterable into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 *
 * @param {object} streamProperties
 * @param {MuxedStream} streamProperties.stream
 * @param {Multiaddr} streamProperties.remoteAddr
 * @param {Multiaddr} streamProperties.localAddr
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {import('libp2p-interfaces/src/transport/types').MultiaddrConnection}
 */
function streamToMaConnection ({ stream, remoteAddr, localAddr }, options = {}) {
  const { sink, source } = stream
  const maConn = {
    /**
     * @param {Uint8Array} source
     */
    async sink (source) {
      if (options.signal) {
        // @ts-ignore ts infers source template will be a number
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
    /** @type {Timeline} */
    timeline: { open: Date.now(), close: undefined },
    close () {
      sink(new Uint8Array(0))
      return close()
    }
  }

  function close () {
    if (!maConn.timeline.close) {
      maConn.timeline.close = Date.now()
    }
    return Promise.resolve()
  }

  return maConn
}

module.exports = streamToMaConnection
