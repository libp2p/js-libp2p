'use strict'

const parallel = require('async/parallel')
const once = require('once')
const debug = require('debug')
const log = debug('libp2p:switch:transport')

const LimitDialer = require('./limit-dialer')

// number of concurrent outbound dials to make per peer, same as go-libp2p-swtch
const defaultPerPeerRateLimit = 8

// the amount of time a single dial has to succeed
// TODO this should be exposed as a option
const dialTimeout = 30 * 1000

/**
 * Manages the transports for the switch. This simplifies dialing and listening across
 * multiple transports.
 */
class TransportManager {
  constructor (_switch) {
    this.switch = _switch
    this.dialer = new LimitDialer(defaultPerPeerRateLimit, dialTimeout)
  }

  /**
   * Adds a `Transport` to the list of transports on the switch, and assigns it to the given key
   *
   * @param {String} key
   * @param {Transport} transport
   * @returns {void}
   */
  add (key, transport) {
    log('adding %s', key)
    if (this.switch.transports[key]) {
      throw new Error('There is already a transport with this key')
    }

    this.switch.transports[key] = transport
    if (!this.switch.transports[key].listeners) {
      this.switch.transports[key].listeners = []
    }
  }

  /**
   * For a given transport `key`, dial to all that transport multiaddrs
   *
   * @param {String} key Key of the `Transport` to dial
   * @param {PeerInfo} peerInfo
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  dial (key, peerInfo, callback) {
    const transport = this.switch.transports[key]
    let multiaddrs = peerInfo.multiaddrs.toArray()

    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    // filter the multiaddrs that are actually valid for this transport
    multiaddrs = TransportManager.dialables(transport, multiaddrs)
    log('dialing %s', key, multiaddrs.map((m) => m.toString()))

    // dial each of the multiaddrs with the given transport
    this.dialer.dialMany(peerInfo.id, transport, multiaddrs, (err, success) => {
      if (err) {
        return callback(err)
      }

      peerInfo.connect(success.multiaddr)
      this.switch._peerBook.put(peerInfo)
      callback(null, success.conn)
    })
  }

  /**
   * For a given Transport `key`, listen on all multiaddrs in the switch's `_peerInfo`.
   * If a `handler` is not provided, the Switch's `protocolMuxer` will be used.
   *
   * @param {String} key
   * @param {*} options
   * @param {function(Connection)} handler
   * @param {function(Error)} callback
   * @returns {void}
   */
  listen (key, options, handler, callback) {
    let muxerHandler

    // if no handler is passed, we pass conns to protocolMuxer
    if (!handler) {
      handler = this.switch.protocolMuxer(key)
    }

    // If we have a protector make the connection private
    if (this.switch.protector) {
      muxerHandler = handler
      handler = (parentConnection) => {
        const connection = this.switch.protector.protect(parentConnection, () => {
          // If we get an error here, we should stop talking to this peer
          muxerHandler(connection)
        })
      }
    }

    const transport = this.switch.transports[key]
    const multiaddrs = TransportManager.dialables(
      transport,
      this.switch._peerInfo.multiaddrs.distinct()
    )

    if (!transport.listeners) {
      transport.listeners = []
    }

    let freshMultiaddrs = []

    const createListeners = multiaddrs.map((ma) => {
      return (cb) => {
        const done = once(cb)
        const listener = transport.createListener(handler)
        listener.once('error', done)

        listener.listen(ma, (err) => {
          if (err) {
            return done(err)
          }
          listener.removeListener('error', done)
          listener.getAddrs((err, addrs) => {
            if (err) {
              return done(err)
            }
            freshMultiaddrs = freshMultiaddrs.concat(addrs)
            transport.listeners.push(listener)
            done()
          })
        })
      }
    })

    parallel(createListeners, (err) => {
      if (err) {
        return callback(err)
      }

      // cause we can listen on port 0 or 0.0.0.0
      this.switch._peerInfo.multiaddrs.replace(multiaddrs, freshMultiaddrs)
      callback()
    })
  }

  /**
   * Closes the transport with the given key, by closing all of its listeners
   *
   * @param {String} key
   * @param {function(Error)} callback
   * @returns {void}
   */
  close (key, callback) {
    const transport = this.switch.transports[key]

    if (!transport) {
      return callback(new Error(`Trying to close non existing transport: ${key}`))
    }

    parallel(transport.listeners.map((listener) => {
      return (cb) => {
        listener.close(cb)
      }
    }), callback)
  }

  /**
   * For a given transport, return its multiaddrs that match the given multiaddrs
   *
   * @param {Transport} transport
   * @param {Array<Multiaddr>} multiaddrs
   * @returns {Array<Multiaddr>}
   */
  static dialables (transport, multiaddrs) {
    return transport.filter(multiaddrs)
  }
}

module.exports = TransportManager
