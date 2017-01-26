'use strict'

const util = require('util')
const EE = require('events').EventEmitter
const each = require('async/each')
const series = require('async/series')
const includes = require('lodash.includes')

const transport = require('./transport')
const connection = require('./connection')
const dial = require('./dial')
const protocolMuxer = require('./protocol-muxer')
const plaintext = require('./plaintext')

exports = module.exports = Swarm

util.inherits(Swarm, EE)

function Swarm (peerInfo) {
  if (!(this instanceof Swarm)) {
    return new Swarm(peerInfo)
  }

  if (!peerInfo) {
    throw new Error('You must provide a value for `peerInfo`')
  }

  this._peerInfo = peerInfo

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

  this.availableTransports = (pi) => {
    const addrs = pi.multiaddrs

    // Only listen on transports we actually have addresses for
    return Object.keys(this.transports).filter((ts) => {
      // ipfs multiaddrs are not dialable so we drop them here
      let dialable = addrs.map((addr) => {
        // webrtc-star needs the /ipfs/QmHash
        if (addr.toString().indexOf('webrtc-star') > 0) {
          return addr
        }

        if (includes(addr.protoNames(), 'ipfs')) {
          return addr.decapsulate('ipfs')
        }
        return addr
      })

      return this.transports[ts].filter(dialable).length > 0
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
    const id = this._peerInfo.id
    const wrapped = this.crypto.encrypt(id, id.privKey, conn)
    return protocolMuxer(this.protocols, wrapped)
  })

  this.unhandle = (protocol) => {
    if (this.protocols[protocol]) {
      delete this.protocols[protocol]
    }
  }

  this.hangUp = (peerInfo, callback) => {
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
