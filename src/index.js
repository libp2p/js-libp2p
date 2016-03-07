const multistream = require('multistream-select')
// const async = require('async')
const identify = require('./identify')
const PassThrough = require('stream').PassThrough

exports = module.exports = Swarm

function Swarm (peerInfo) {
  if (!(this instanceof Swarm)) {
    return new Swarm(peerInfo)
  }

  if (!peerInfo) {
    throw new Error('You must provide a value for `peerInfo`')
  }

  // transports --

  // { key: transport }; e.g { tcp: <tcp> }
  this.transports = {}

  this.transport = {}

  this.transport.add = (key, transport, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    if (!callback) { callback = noop }

    if (this.transports[key]) {
      throw new Error('There is already a transport with this key')
    }
    this.transports[key] = transport
    callback()
  }

  this.transport.dial = (key, multiaddrs, callback) => {
    const t = this.transports[key]

    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    // TODO a) filter the multiaddrs that are actually valid for this transport (use a func from the transport itself)

    // b) if multiaddrs.length = 1, return the conn from the
    // transport, otherwise, create a passthrough
    if (multiaddrs.length === 1) {
      const conn = t.dial(multiaddrs.shift(), {ready: () => {
        const cb = callback
        callback = noop // this is done to avoid connection drops as connect errors
        cb(null, conn)
      }})
      conn.once('error', () => {
        callback(new Error('failed to connect to every multiaddr'))
      })
      return conn
    }

    // c) multiaddrs should already be a filtered list
    // specific for the transport we are using
    const pt = new PassThrough()

    next(multiaddrs.shift())
    return pt
    function next (multiaddr) {
      const conn = t.dial(multiaddr, {ready: () => {
        pt.pipe(conn).pipe(pt)
        const cb = callback
        callback = noop // this is done to avoid connection drops as connect errors
        cb(null, pt)
      }})

      conn.once('error', () => {
        if (multiaddrs.length === 0) {
          return callback(new Error('failed to connect to every multiaddr'))
        }
        next(multiaddrs.shift())
      })
    }
  }

  this.transport.listen = (key, options, handler, callback) => {
    // if no callback is passed, we pass conns to connHandler
    if (!handler) { handler = connHandler }

    const multiaddrs = peerInfo.multiaddrs.filter((m) => {
      if (m.toString().indexOf('tcp') !== -1) {
        return m
      }
    })

    this.transports[key].createListener(multiaddrs, handler, (err, maUpdate) => {
      if (err) {
        return callback(err)
      }
      if (maUpdate) {
        // because we can listen on port 0...
        peerInfo.multiaddr.replace(multiaddrs, maUpdate)
      }

      callback()
    })
  }

  this.transport.close = (key, callback) => {
    this.transports[key].close(callback)
  }

  // connections --

  // { peerIdB58: { conn: <conn> }}
  this.conns = {}

  // {
  //   peerIdB58: {
  //     muxer: <muxer>
  //     rawSocket: socket // to abstract info required for the Identify Protocol
  //   }
  // }
  this.muxedConns = {}

  // { protocol: handler }
  this.protocols = {}

  this.connection = {}
  this.connection.addUpgrade = () => {}

  // { muxerCodec: <muxer> } e.g { '/spdy/0.3.1': spdy }
  this.muxers = {}
  this.connection.addStreamMuxer = (muxer) => {
    // for dialing
    this.muxers[muxer.multicodec] = muxer

    // for listening
    this.handle(muxer.multicodec, (conn) => {
      const muxedConn = muxer(conn, true)
      muxedConn.on('stream', connHandler)

      if (this.identify) {
        identify.exec(muxedConn, (err, pi) => {
          if (err) {}
          // TODO muxedConns[pi.id.toB58String()].muxer = muxedConn
        })
      }
    })
  }

  // enable the Identify protocol
  this.identify = false
  this.connection.reuse = () => {
    this.identify = true
    this.handle(identify.multicodec, identify.handler(peerInfo))
  }

  const self = this // couldn't get rid of this

  // incomming connection handler
  function connHandler (conn) {
    var msS = new multistream.Select()
    msS.handle(conn)
    Object.keys(self.protocols).forEach(function (protocol) {
      msS.addHandler(protocol, self.protocols[protocol])
    })
  }

  // higher level (public) API
  this.dial = (pi, protocol, callback) => {
    var pt = null
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    } else {
      pt = new PassThrough()
    }

    const b58Id = pi.id.toB58String()
    if (!this.muxedConns[b58Id]) {
      if (!this.conns[b58Id]) {
        attemptDial(pi, (err, conn) => {
          if (err) {
            return callback(err)
          }
          gotWarmedUpConn(conn)
        })
      } else {
        const conn = this.conns[b58Id]
        this.conns[b58Id] = undefined
        gotWarmedUpConn(conn)
      }
    } else {
      gotMuxer(this.muxedConns[b58Id].muxer)
    }

    function gotWarmedUpConn (conn) {
      attemptMuxerUpgrade(conn, (err, muxer) => {
        if (!protocol) {
          if (err) {
            self.conns[b58Id] = conn
          }
          return callback()
        }

        if (err) {
          // couldn't upgrade to Muxer, it is ok
          protocolHandshake(conn, protocol, callback)
        } else {
          gotMuxer(muxer)
        }
      })
    }

    function gotMuxer (muxer) {
      openConnInMuxedConn(muxer, (conn) => {
        protocolHandshake(conn, protocol, callback)
      })
    }

    function attemptDial (pi, cb) {
      const tKeys = Object.keys(self.transports)
      nextTransport(tKeys.shift())

      function nextTransport (key) {
        const multiaddrs = pi.multiaddrs.slice()
        self.transport.dial(key, multiaddrs, (err, conn) => {
          if (err) {
            if (tKeys.length === 0) {
              return cb(new Error('Could not dial in any of the transports'))
            }
            return nextTransport(tKeys.shift())
          }
          cb(null, conn)
        })
      }
    }

    function attemptMuxerUpgrade (conn, cb) {
      const muxers = Object.keys(self.muxers)
      if (muxers.length === 0) {
        return cb(new Error('no muxers available'))
      }

      // 1. try to handshake in one of the muxers available
      // 2. if succeeds
      //  - add the muxedConn to the list of muxedConns
      //  - add incomming new streams to connHandler

      nextMuxer(muxers.shift())

      function nextMuxer (key) {
        var msI = new multistream.Interactive()
        msI.handle(conn, function () {
          msI.select(key, (err, conn) => {
            if (err) {
              if (muxers.length === 0) {
                cb(new Error('could not upgrade to stream muxing'))
              } else {
                nextMuxer(muxers.shift())
              }
            }

            const muxedConn = self.muxers[key](conn, false)
            self.muxedConns[b58Id] = {}
            self.muxedConns[b58Id].muxer = muxedConn
            cb(null, muxedConn)
          })
        })
      }
    }
    function openConnInMuxedConn (muxer, cb) {
      cb(muxer.newStream())
    }

    function protocolHandshake (conn, protocol, cb) {
      var msI = new multistream.Interactive()
      msI.handle(conn, function () {
        msI.select(protocol, (err, conn) => {
          if (err) {
            return callback(err)
          }
          pt.pipe(conn).pipe(pt)
          callback(null, pt)
        })
      })
    }
  }

  this.handle = (protocol, handler) => {
    this.protocols[protocol] = handler
  }

  this.close = (callback) => {
    var count = 0

    Object.keys(this.muxedConns).forEach((key) => {
      this.muxedConns[key].muxer.end()
    })

    Object.keys(this.transports).forEach((key) => {
      this.transports[key].close(() => {
        if (++count === Object.keys(this.transports).length) {
          callback()
        }
      })
    })
  }
}

function noop () {}
