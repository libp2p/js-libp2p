'use strict'

/* eslint no-warning-comments: off */

const parallel = require('async/parallel')
const once = require('once')
const debug = require('debug')
const log = debug('libp2p:switch:transport')

const LimitDialer = require('./limit-dialer')
const { DIAL_TIMEOUT } = require('./constants')
const { uniqueBy } = require('./utils')

// number of concurrent outbound dials to make per peer, same as go-libp2p-swtch
const defaultPerPeerRateLimit = 8

/**
 * Manages the transports for the switch. This simplifies dialing and listening across
 * multiple transports.
 */
class TransportManager {
  constructor (_switch) {
    this.switch = _switch
    this.dialer = new LimitDialer(defaultPerPeerRateLimit, this.switch._options.dialTimeout || DIAL_TIMEOUT)
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
   * Closes connections for the given transport key
   * and removes it from the switch.
   *
   * @param {String} key
   * @param {function(Error)} callback
   * @returns {void}
   */
  remove (key, callback) {
    callback = callback || function () {}

    if (!this.switch.transports[key]) {
      return callback()
    }

    this.close(key, (err) => {
      delete this.switch.transports[key]
      callback(err)
    })
  }

  /**
   * Calls `remove` on each transport the switch has
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  removeAll (callback) {
    const tasks = Object.keys(this.switch.transports).map((key) => {
      return (cb) => {
        this.remove(key, cb)
      }
    })

    parallel(tasks, callback)
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
    multiaddrs = TransportManager.dialables(transport, multiaddrs, this.switch._peerInfo)
    log('dialing %s', key, multiaddrs.map((m) => m.toString()))

    // dial each of the multiaddrs with the given transport
    this.dialer.dialMany(peerInfo.id, transport, multiaddrs, (errors, success) => {
      if (errors) {
        return callback(errors)
      }

      peerInfo.connect(success.multiaddr)
      callback(null, success.conn)
    })
  }

  /**
   * For a given Transport `key`, listen on all multiaddrs in the switch's `_peerInfo`.
   * If a `handler` is not provided, the Switch's `protocolMuxer` will be used.
   *
   * @param {String} key
   * @param {*} _options Currently ignored
   * @param {function(Connection)} handler
   * @param {function(Error)} callback
   * @returns {void}
   */
  listen (key, _options, handler, callback) {
    handler = this.switch._connectionHandler(key, handler)

    const transport = this.switch.transports[key]
    let originalAddrs = this.switch._peerInfo.multiaddrs.toArray()

    // Until TCP can handle distinct addresses on listen, https://github.com/libp2p/interface-transport/issues/41,
    // make sure we aren't trying to listen on duplicate ports. This also applies to websockets.
    originalAddrs = uniqueBy(originalAddrs, (addr) => {
      // Any non 0 port should register as unique
      const port = Number(addr.toOptions().port)
      return isNaN(port) || port === 0 ? addr.toString() : port
    })

    const multiaddrs = TransportManager.dialables(transport, originalAddrs)

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
   * @param {PeerInfo} peerInfo Optional - a peer whose addresses should not be returned
   * @returns {Array<Multiaddr>}
   */
  static dialables (transport, multiaddrs, peerInfo) {
    // If we dont have a proper transport, return no multiaddrs
    if (!transport || !transport.filter) return []

    const transportAddrs = transport.filter(multiaddrs)
    if (!peerInfo || !transportAddrs.length) {
      return transportAddrs
    }

    const ourAddrs = ourAddresses(peerInfo)

    const result = transportAddrs.filter(transportAddr => {
      // If our address is in the destination address, filter it out
      return !ourAddrs.some(a => getDestination(transportAddr).startsWith(a))
    })

    return result
  }
}

/**
 * Expand addresses in peer info into array of addresses with and without peer
 * ID suffix.
 *
 * @param {PeerInfo} peerInfo Our peer info object
 * @returns {String[]}
 */
function ourAddresses (peerInfo) {
  const ourPeerId = peerInfo.id.toB58String()
  return peerInfo.multiaddrs.toArray()
    .reduce((ourAddrs, addr) => {
      const peerId = addr.getPeerId()
      addr = addr.toString()
      const otherAddr = peerId
        ? addr.slice(0, addr.lastIndexOf(`/ipfs/${peerId}`))
        : `${addr}/ipfs/${ourPeerId}`
      return ourAddrs.concat([addr, otherAddr])
    }, [])
    .filter(a => Boolean(a))
    .concat(`/ipfs/${ourPeerId}`)
}

const RelayProtos = [
  'p2p-circuit',
  'p2p-websocket-star',
  'p2p-webrtc-star',
  'p2p-stardust'
]

/**
 * Get the destination address of a (possibly relay) multiaddr as a string
 *
 * @param {Multiaddr} addr
 * @returns {String}
 */
function getDestination (addr) {
  const protos = addr.protoNames().reverse()
  const splitProto = protos.find(p => RelayProtos.includes(p))
  addr = addr.toString()
  if (!splitProto) return addr
  return addr.slice(addr.lastIndexOf(splitProto) + splitProto.length)
}

module.exports = TransportManager
