var multistream = require('multistream-select')
var async = require('async')

exports = module.exports = Swarm

function Swarm (peerInfo) {
  var self = this

  if (!(self instanceof Swarm)) {
    throw new Error('Swarm must be called with new')
  }

  self.peerInfo = peerInfo

  // peerIdB58: { conn: <conn> }
  self.conns = {}

  // peerIdB58: { muxer: <muxer> }
  self.muxedConns = {}

  // transportName: { transport: transport,
  //                  dialOptions: dialOptions,
  //                  listenOptions: listenOptions,
  //                  listeners: [] }
  self.transports = {}

  self.listeners = {}

  self.protocols = {}

  // muxerName: { muxer: muxer
  //              options: options }
  self.muxers = {}

  // public interface

  self.addTransport = function (name, transport, options, dialOptions, listenOptions, callback) {
    // set up the transport and add the list of incoming streams
    // add transport to the list of transports

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
      if (options.multiaddr) {
        self.peerInfo.multiaddrs.push(options.multiaddr)
      }

      callback()
    })
  }

  self.addUpgrade = function (ConnUpgrade, options) {

  }

  self.addStreamMuxer = function (StreamMuxer, options) {

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
        multistreamHandshake(self.conns[peerInfo.id.toB58String()])
        self.conns[peerInfo.id.toB58String()] = undefined
        delete self.conns[peerInfo.id.toB58String()]
        return
      } else {
        return callback()
      }
    }

    // check if a stream muxer for this peer is available
    if (self.muxedConns[peerInfo.id.toB58String()]) {
      return openMuxedStream()
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
      // TODO apply stream muxer
      // if no protocol is selected, save it in the pool
      // if protocol is selected, multistream that protocol
      if (!conn) {
        callback(new Error('Unable to open a connection'))
      }

      if (protocol) {
        multistreamHandshake(conn)
      } else {
        self.conns[peerInfo.id.toB58String()] = conn
        callback()
      }
    }

    function openMuxedStream () {
      // 1. create a new stream on this muxedConn and pass that to
      // multistreamHanshake
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

  self.closeConns = function (callback) {
    // close warmed up cons so that the listener can gracefully exit
    Object.keys(self.conns).forEach(function (conn) {
      self.conns[conn].destroy()
    })
    self.conns = {}

    callback()
  }

  self.close = function (callback) {
    // close everything
  }

  self.handleProtocol = function (protocol, handlerFunction) {
    self.protocols[protocol] = handlerFunction
  }

  // internals

  function listen (conn) {
    // TODO apply upgrades
    // TODO then add StreamMuxer if available (and point streams from muxer to userProtocolMuxer)

    // if no stream muxer, then
    userProtocolMuxer(conn)
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
