var tcp = require('net')
var Select = require('multistream-select').Select
var Interactive = require('multistream-select').Interactive
var spdy = require('spdy-transport')
// var identify = require('./identify')
var log = require('ipfs-logger').group('swarm')
var async = require('async')

exports = module.exports = Swarm

function Swarm () {
  var self = this

  if (!(self instanceof Swarm)) {
    throw new Error('Swarm must be called with new')
  }

  self.port = parseInt(process.env.IPFS_SWARM_PORT, 10) || 4001
  self.connections = {}
  self.handles = []

  // set the listener

  self.listen = function () {
    console.log('GOING TO LISTEN ON: ', self.port)
    tcp.createServer(function (socket) {
      console.log('GOT INCOMING CONNECTION')

      var ms = new Select()
      ms.handle(socket)
      ms.addHandler('/spdy/3.1.0', function (ds) {
        console.log('GOT SPDY HANDLER REQUEST')
        log.info('Negotiated spdy with incoming socket')
        log.info('Buffer should be clean  - ', ds.read())
        var spdyConnection = spdy.connection.create(ds, {
          protocol: 'spdy',
          isServer: true
        })

        spdyConnection.start(3.1)

        // attach multistream handlers to incoming streams
        spdyConnection.on('stream', function (spdyStream) {
          registerHandles(spdyStream)
        })

        // learn about the other peer Identity
        /* TODO(daviddias)
        identify.inquiry(spdyConnection, function (err, spdyConnection, peerIdB58) {
          if (err) {
            return log.error(err)
          }
          if (self.connections[peerIdB58]) {
            return log.error('New connection established with a peer(' + peerIdB58 + ') that we already had a connection')
          }
          spdyConnection.peerId = peerIdB58
          self.connections[peerIdB58] = spdyConnection
        })
        */

        // close the connection when all the streams close
        spdyConnection.on('close', function () {
          delete self.connections[spdyConnection.peerId]
        })
      })
    }).listen(self.port)
  }

  // interface

  self.openStream = function (peer, protocol, cb) {
    // if Connection already open, open a new stream, otherwise, create a new Connection
    // then negoatite the protocol and return the opened stream

    // If no connection open yet, open it
    if (!self.connections[peer.id.toB58String()]) {
      // Establish a socket with one of the addresses
      var gotOne = false
      async.eachSeries(peer.multiaddrs, function (multiaddr, callback) {
        if (gotOne) {
          return callback()
        }
        var socket = tcp.connect(multiaddr.toOptions(), function connected () {
          console.log('CONNECTED TO: ', multiaddr.toString())
          gotSocket(socket)
        })

        socket.once('error', function (err) {
          log.warn('Could not connect using one of the address of peer - ', peer.id.toB58String(), err)
          callback()
        })

      }, function done () {
        if (!gotOne) {
          cb(new Error('Not able to open a scoket with peer - ', peer.id.toB58String()))
        }
      })

    } else {
      createStream(peer, protocol, cb)
    }

    // do the spdy people dance (multistream-select into spdy)
    function gotSocket (socket) {
      console.log('GOT SOCKET')
      gotOne = true
      var msi = new Interactive()
      msi.handle(socket, function () {
        console.log('GOING TO NEGOTIATE SPDY')
        msi.select('/spdy/3.1.0', function (err, ds) {
          if (err) {
            return console.log('err', err)
          }
          var spdyConnection = spdy.connection.create(ds, {
            protocol: 'spdy',
            isServer: false
          })
          spdyConnection.start(3.1)
          self.connections[peer.id.toB58String()] = spdyConnection

          // attach multistream handlers to incoming streams
          spdyConnection.on('stream', function (spdyStream) {
            registerHandles(spdyStream)
          })

          createStream(peer, protocol, cb)
        })
      })
    }

    function createStream (peer, protocol, cb) {
      // 1. to pop a new stream on the connection
      // 2. negotiate the requested protocol through multistream
      // 3. return back the stream when that is negotiated
      var conn = self.connections[peer.id.toB58String()]
      conn.request({path: '/', method: 'GET'}, function (err, stream) {
        if (err) {
          return cb(err)
        }
        var msi = new Interactive()
        msi.handle(stream, function () {
          msi.select(protocol, function (err, ds) {
            if (err) {
              return cb(err)
            }
            cb(null, ds) // wohoo we finally delivered the stream the user wanted
          })
        })
      })

      conn.on('close', function () {
        // TODO(daviddias) remove it from collections
      })

    }

  }

  self.registerHandle = function (protocol, cb) {
    if (self.handles[protocol]) {
      var err = new Error('Handle for protocol already exists', protocol)
      log.error(err)
      return cb(err)
    }
    self.handles.push({ protocol: protocol, func: cb })
    log.info('Registered handler for protocol:', protocol)
  }

  function registerHandles (spdyStream) {
    log.info('Preparing stream to handle the registered protocols')
    var msH = new Select()
    msH.handle(spdyStream)
    self.handles.forEach(function (handle) {
      msH.addHandler(handle.protocol, handle.func)
    })
  }

}
