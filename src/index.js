// const multistream = require('multistream-select')
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

    // a) if multiaddrs.length = 1, return the conn from the
    // transport, otherwise, create a passthrough
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }
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

    // b) multiaddrs should already be a filtered list
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
  //     muxerName: {
  //       muxer: <muxer>
  //       rawSocket: socket // to abstract info required for the Identify Protocol
  //     }
  //   }
  this.muxedConns = {}

  this.connection = {}
  this.connection.addUpgrade = () => {}
  this.connection.addStreamMuxer = () => {}

  // enable the Identify protocol
  this.connection.reuse = () => {}

  // main API - higher level abstractions --

  this.dial = () => {
    // TODO
  }
  this.handle = (protocol, callback) => {
    // TODO
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

  function connHandler (conn) {
    // do all the multistream select handshakes (this should be probably done recursively
  }
}

/*
function Swarm (peerInfo) {
  var self = this
  if (!(this instanceof Swarm)) {
    return new Swarm(peerInfo)
  }

  if (!peerInfo) {
    throw new Error('You must provide a value for `peerInfo`')
  }

  self.peerInfo = peerInfo

  // peerIdB58: { conn: <conn> }
  self.conns = {}

  // peerIdB58: {
  //   muxer: <muxer>,
  //   socket: socket // so we can extract the info we need for identify
  // }
  self.muxedConns = {}

  // transportName: { transport: transport,
  //                  dialOptions: dialOptions,
  //                  listenOptions: listenOptions,
  //                  listeners: [] }
  self.transports = {}

  // transportName: listener
  self.listeners = {}

  // protocolName: handlerFunc
  self.protocols = {}

  // muxerName: { Muxer: Muxer // Muxer is a constructor
  //              options: options }
  self.muxers = {}

  // for connection reuse
  self.identify = false

  // public interface

  self.addTransport = function (name, transport, options, dialOptions, listenOptions, callback) {
    // set up the transport and add the list of incoming streams
    // add transport to the list of transports

    var multiaddr = options.multiaddr
    if (multiaddr) {
      // no need to pass that to the transports
      delete options.multiaddr
    }

    var listener = transport.createListener(options, listen)

    listener.listen(listenOptions, function ready () {
      self.transports[name] = {
        transport: transport,
        options: options,
        dialOptions: dialOptions,
        listenOptions: listenOptions,
        listener: listener
      }

      // If a known multiaddr is passed, then add to our list of multiaddrs
      if (multiaddr) {
        self.peerInfo.multiaddrs.push(multiaddr)
      }

      callback()
    })
  }

  self.addUpgrade = function (ConnUpgrade, options) {}

  self.addStreamMuxer = function (name, StreamMuxer, options) {
    self.muxers[name] = {
      Muxer: StreamMuxer,
      options: options
    }
  }

  self.dial = function (peerInfo, options, protocol, callback) {
    // 1. check if we have transports we support
    // 2. check if we have a conn waiting
    // 3. check if we have a stream muxer available

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    // check if a conn is waiting
    //   if it is and protocol was selected, jump into multistreamHandshake
    //   if it is and no protocol was selected, do nothing and call and empty callback

    if (self.conns[peerInfo.id.toB58String()]) {
      if (protocol) {
        if (self.muxers['spdy']) {
          // TODO upgrade this conn to a muxer
          console.log('TODO: upgrade a warm conn to muxer that was added after')
        } else {
          multistreamHandshake(self.conns[peerInfo.id.toB58String()])
        }
        self.conns[peerInfo.id.toB58String()] = undefined
        delete self.conns[peerInfo.id.toB58String()]
        return
      } else {
        return callback()
      }
    }

    // check if a stream muxer for this peer is available
    if (self.muxedConns[peerInfo.id.toB58String()]) {
      if (protocol) {
        return openMuxedStream(self.muxedConns[peerInfo.id.toB58String()].muxer)
      } else {
        return callback()
      }
    }

    // Creating a new conn with this peer routine

    // TODO - check if there is a preference in protocol to use on
    // options.protocol
    var supportedTransports = Object.keys(self.transports)
    var multiaddrs = peerInfo.multiaddrs.filter(function (multiaddr) {
      return multiaddr.protoNames().some(function (proto) {
        return supportedTransports.indexOf(proto) >= 0
      })
    })

    if (!multiaddrs.length) {
      callback(new Error("The swarm doesn't support any of the peer transports"))
      return
    }

    var conn

    async.eachSeries(multiaddrs, function (multiaddr, next) {
      if (conn) {
        return next()
      }

      var transportName = getTransportNameForMultiaddr(multiaddr)
      var transport = self.transports[transportName]
      var dialOptions = clone(transport.dialOptions)
      dialOptions.ready = connected

      var connTry = transport.transport.dial(multiaddr, dialOptions)

      connTry.once('error', function (err) {
        if (err) {
          return console.log(err) // TODO handle error
        }
        next() // try next multiaddr
      })

      function connected () {
        conn = connTry
        next()
      }

      function getTransportNameForMultiaddr (multiaddr) {
        // this works for all those ip + transport + port tripplets
        return multiaddr.protoNames()[1]
      }

      function clone (obj) {
        var target = {}
        for (var i in obj) {
          if (obj.hasOwnProperty(i)) {
            target[i] = obj[i]
          }
        }
        return target
      }
    }, done)

    function done () {
      // TODO apply upgrades
      // apply stream muxer
      // if no protocol is selected, save it in the pool
      // if protocol is selected, multistream that protocol
      if (!conn) {
        callback(new Error('Unable to open a connection'))
        return
      }

      if (self.muxers['spdy']) {
        var spdy = new self.muxers['spdy'].Muxer(self.muxers['spdy'].options)
        spdy.attach(conn, false, function (err, muxer) {
          if (err) {
            return console.log(err) // TODO Treat error
          }

          muxer.on('stream', userProtocolMuxer)

          self.muxedConns[peerInfo.id.toB58String()] = {
            muxer: muxer,
            socket: conn
          }

          if (protocol) {
            openMuxedStream(muxer)
          } else {
            callback()
          }
        })
      } else {
        if (protocol) {
          multistreamHandshake(conn)
        } else {
          self.conns[peerInfo.id.toB58String()] = conn
          callback()
        }
      }
    }

    function openMuxedStream (muxer) {
      // 1. create a new stream on this muxedConn and pass that to
      // multistreamHanshake
      muxer.dialStream(function (err, conn) {
        if (err) {
          return console.log(err) // TODO Treat error
        }
        multistreamHandshake(conn)
      })
    }

    function multistreamHandshake (conn) {
      var msI = new multistream.Interactive()
      msI.handle(conn, function () {
        msI.select(protocol, callback)
      })
    }
  }

  self.closeListener = function (transportName, callback) {
    self.transports[transportName].listener.close(closed)

    // only gets called when all the streams on this transport are closed too
    function closed () {
      delete self.transports[transportName]
      callback()
    }
  }

  // Iterates all the listeners closing them
  // one by one. It calls back once all are closed.
  self.closeAllListeners = function (callback) {
    var transportNames = Object.keys(self.transports)

    async.each(transportNames, self.closeListener, callback)
  }

  self.closeConns = function (callback) {
    // close warmed up cons so that the listener can gracefully exit
    Object.keys(self.conns).forEach(function (conn) {
      self.conns[conn].destroy()
    })
    self.conns = {}

    callback()
  }

  // Closes both transport listeners and
  // connections. It calls back once everything
  // is closed
  self.close = function (callback) {
    async.parallel([
      self.closeAllListeners,
      self.closeConns
    ], callback)
  }

  self.enableIdentify = function () {
    // set flag to true
    // add identify to the list of handled protocols
    self.identify = true

    // we pass muxedConns so that identify can access the socket of the other
    // peer
    self.handleProtocol(identify.protoId,
      identify.getHandlerFunction(self.peerInfo, self.muxedConns))
  }

  self.handleProtocol = function (protocol, handlerFunction) {
    self.protocols[protocol] = handlerFunction
  }

  // internals

  function listen (conn) {
    // TODO apply upgrades
    // add StreamMuxer if available (and point streams from muxer to userProtocolMuxer)

    if (self.muxers['spdy']) {
      var spdy = new self.muxers['spdy'].Muxer(self.muxers['spdy'].options)
      spdy.attach(conn, true, function (err, muxer) {
        if (err) {
          return console.log(err) // TODO treat error
        }

        // TODO This muxer has to be identified!
        // pass to identify a reference of
        //   our muxedConn list
        //   ourselves (peerInfo)
        //   the conn, which is the socket
        //   and a stream it can send stuff
        if (self.identify) {
          muxer.dialStream(function (err, stream) {
            if (err) {
              return console.log(err) // TODO Treat error
            }
            // conn === socket at this point
            identify(self.muxedConns, self.peerInfo, conn, stream, muxer)
          })
        }

        muxer.on('stream', userProtocolMuxer)
      })
    } else {
      // if no stream muxer, then
      userProtocolMuxer(conn)
    }
  }

  // Handle user given protocols
  function userProtocolMuxer (conn) {
    var msS = new multistream.Select()
    msS.handle(conn)
    Object.keys(self.protocols).forEach(function (protocol) {
      msS.addHandler(protocol, self.protocols[protocol])
    })
  }
}
*/

function noop () {}
