const multistream = require('multistream-select')
// const async = require('async')
// const identify = require('./identify')
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
    // TODO
    // .handle(protocol, () => {
    //   after attaching the stream muxer, check if identify is enabled
    // })
    // TODO add to the list of muxers available
  }

  // enable the Identify protocol
  this.connection.reuse = () => {
    // TODO identify
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
      if (Object.keys(self.muxers).length === 0) {
        return cb(new Error('no muxers available'))
      }
      // TODO add muxer to the muxedConns object for the peerId
      // TODO if it succeeds, add incomming open coons to connHandler
    }
    function openConnInMuxedConn (muxer, cb) {
      // TODO open a conn in this muxer
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
