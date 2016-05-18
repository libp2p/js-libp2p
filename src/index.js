'use strict'

const util = require('util')
const EE = require('events').EventEmitter
const parallel = require('run-parallel')
const contains = require('lodash.contains')

const transport = require('./transport')
const connection = require('./connection')
const dial = require('./dial')
const connHandler = require('./default-handler')

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

  this.transport = transport(this)
  this.connection = connection(this)

  this.availableTransports = (pi) => {
    const addrs = pi.multiaddrs

    // Only listen on transports we actually have addresses for
    return Object.keys(this.transports).filter((ts) => {
      // ipfs multiaddrs are not dialable so we drop them here
      let dialable = addrs.map((addr) => {
        if (contains(addr.protoNames(), 'ipfs')) {
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
    parallel(this.availableTransports(peerInfo).map((ts) => (cb) => {
      // Listen on the given transport
      this.transport.listen(ts, {}, null, cb)
    }), callback)
  }

  this.handle = (protocol, handler) => {
    this.protocols[protocol] = handler
  }

  // our crypto handshake :)
  this.handle('/plaintext/1.0.0', (conn) => {
    connHandler(this.protocols, conn)
  })

  this.unhandle = (protocol, handler) => {
    if (this.protocols[protocol]) {
      delete this.protocols[protocol]
    }
  }

  this.close = (callback) => {
    Object.keys(this.muxedConns).forEach((key) => {
      this.muxedConns[key].muxer.end()
    })

    parallel(Object.keys(this.transports).map((key) => {
      return (cb) => this.transports[key].close(cb)
    }), callback)
  }
}
