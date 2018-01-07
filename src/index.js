'use strict'

const util = require('util')
const EE = require('events').EventEmitter
const each = require('async/each')
const series = require('async/series')
const transport = require('./transport')
const connection = require('./connection')
const getPeerInfo = require('./get-peer-info')
const dial = require('./dial')
const protocolMuxer = require('./protocol-muxer')
const plaintext = require('./plaintext')
const assert = require('assert')

exports = module.exports = Swarm

util.inherits(Swarm, EE)

function Swarm (peerInfo, peerBook) {
  if (!(this instanceof Swarm)) {
    return new Swarm(peerInfo)
  }

  assert(peerInfo, 'You must provide a `peerInfo`')
  assert(peerBook, 'You must provide a `peerBook`')

  this._peerInfo = peerInfo
  this._peerBook = peerBook

  this.setMaxListeners(Infinity)
  // transports --
  // { key: transport }; e.g { tcp: <tcp> }
  this.transports = {}

  // connections --
  // { peerIdB58: { conn: <conn> }}
  this.conns = {}

  // {
  //   peerIdB58: {
  //     muxer: <muxer>
  //     conn: <transport socket> // to extract info required for the Identify Protocol
  //   }
  // }
  this.muxedConns = {}

  // { protocol: handler }
  this.protocols = {}

  // { muxerCodec: <muxer> } e.g { '/spdy/0.3.1': spdy }
  this.muxers = {}

  // is the Identify protocol enabled?
  this.identify = false

  // Crypto details
  this.crypto = plaintext

  this.transport = transport(this)
  this.connection = connection(this)

  this.hasTransports = () => {
    const transports = Object.keys(this.transports).filter((t) => t !== 'Circuit')
    return transports && transports.length > 0
  }

  this.availableTransports = (pi) => {
    const myAddrs = pi.multiaddrs.toArray()
    const myTransports = Object.keys(this.transports)

    // Only listen on transports we actually have addresses for
    return myTransports.filter((ts) => this.transports[ts].filter(myAddrs).length > 0)
      // push Circuit to be the last proto to be dialed
      .sort((a) => {
        return a === 'Circuit' ? 1 : 0
      })
  }

  // higher level (public) API
  this.dial = dial(this)

  // Start listening on all available transports
  this.listen = (callback) => {
    each(this.availableTransports(peerInfo), (ts, cb) => {
      // Listen on the given transport
      this.transport.listen(ts, {}, null, cb)
    }, callback)
  }

  this.handle = (protocol, handlerFunc, matchFunc) => {
    this.protocols[protocol] = {
      handlerFunc: handlerFunc,
      matchFunc: matchFunc
    }
  }

  this.handle(this.crypto.tag, (protocol, conn) => {
    const peerId = this._peerInfo.id
    const wrapped = this.crypto.encrypt(peerId, conn, undefined, () => {})
    return protocolMuxer(this.protocols, wrapped)
  })

  this.unhandle = (protocol) => {
    if (this.protocols[protocol]) {
      delete this.protocols[protocol]
    }
  }

  this.hangUp = (peer, callback) => {
    const peerInfo = getPeerInfo(peer, this.peerBook)
    const key = peerInfo.id.toB58String()
    if (this.muxedConns[key]) {
      const muxer = this.muxedConns[key].muxer
      muxer.once('close', () => {
        delete this.muxedConns[key]
        callback()
      })
      muxer.end()
    } else {
      callback()
    }
  }

  this.close = (callback) => {
    series([
      (cb) => each(this.muxedConns, (conn, cb) => {
        conn.muxer.end((err) => {
          // If OK things are fine, and someone just shut down
          if (err && err.message !== 'Fatal error: OK') {
            return cb(err)
          }
          cb()
        })
      }, cb),
      (cb) => {
        each(this.transports, (transport, cb) => {
          each(transport.listeners, (listener, cb) => {
            listener.close(cb)
          }, cb)
        }, cb)
      }
    ], callback)
  }
}
