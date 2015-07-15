var tcp = require('net')
var Select = require('multistream-select').Select
var Interactive = require('multistream-select').Interactive
var Muxer = require('./stream-muxer')
var log = require('ipfs-logger').group('swarm')
var async = require('async')
var EventEmitter = require('events').EventEmitter
var util = require('util')

exports = module.exports = Swarm

util.inherits(Swarm, EventEmitter)

function Swarm () {
  var self = this

  if (!(self instanceof Swarm)) {
    throw new Error('Swarm must be called with new')
  }

  self.port = parseInt(process.env.IPFS_SWARM_PORT, 10) || 4001

  self.connections = {}
  self.handles = []

  // set the listener

  self.listen = function (port, ready) {
    if (!ready) { ready = function noop () {} }
    if (typeof port === 'function') {
      ready = port
    } else if (port) { self.port = port }

    self.listener = tcp.createServer(function (socket) {
      errorUp(self, socket)
      var ms = new Select()
      ms.handle(socket)
      ms.addHandler('/spdy/3.1.0', function (ds) {
        log.info('Negotiated spdy with incoming socket')

        var conn = new Muxer().attach(ds, false)

        // attach multistream handlers to incoming streams

        conn.on('stream', function () {
          console.log('HERE')
        })
        conn.on('error', function () {
          console.log('error here')
        })

        conn.on('stream', registerHandles)
        errorUp(self, conn)

        // FOR IDENTIFY
        self.emit('connection-unknown', conn)

        // IDENTIFY DOES THIS FOR US
        // conn.on('close', function () { delete self.connections[conn.peerId] })
      })
    }).listen(self.port, ready)
    errorUp(self, self.listener)
  }

  // interface

  // open stream account for connection reuse
  self.openStream = function (peer, protocol, cb) {
    // If no connection open yet, open it
    if (!self.connections[peer.id.toB58String()]) {
      // Establish a socket with one of the addresses
      var socket
      async.eachSeries(peer.multiaddrs, function (multiaddr, next) {
        if (socket) { return next() }

        var tmp = tcp.connect(multiaddr.toOptions(), function () {
          socket = tmp
          errorUp(self, socket)
          next()
        })

        tmp.once('error', function (err) {
          log.warn(multiaddr.toString(), 'on', peer.id.toB58String(), 'not available', err)
          next()
        })

      }, function done () {
        if (!socket) {
          return cb(new Error('Not able to open a scoket with peer - ',
            peer.id.toB58String()))
        }
        gotSocket(socket)
      })
    } else {
      createStream(peer, protocol, cb)
    }

    // do the spdy people dance (multistream-select into spdy)
    function gotSocket (socket) {
      var msi = new Interactive()
      msi.handle(socket, function () {
        msi.select('/spdy/3.1.0', function (err, ds) {
          if (err) { cb(err) }

          var conn = new Muxer().attach(ds, false)
          conn.on('stream', function () {
            console.log('WOOHO NEW STREAM')
          })
          conn.on('error', function () {
            console.log('BADUM TSS')
          })
          conn.on('stream', registerHandles)
          self.connections[peer.id.toB58String()] = conn
          conn.on('close', function () { delete self.connections[peer.id.toB58String()] })
          errorUp(self, conn)

          createStream(peer, protocol, cb)
        })
      })
    }

    function createStream (peer, protocol, cb) {
      // spawn new muxed stream
      var conn = self.connections[peer.id.toB58String()]
      conn.dialStream(function (err, stream) {
        if (err) { return cb(err) }
        errorUp(self, stream)
        stream.on('error', function (err) {
          console.log('error here - ', err)
        })
        // negotiate desired protocol
        var msi = new Interactive()
        msi.handle(stream, function () {
          msi.select(protocol, function (err, ds) {
            if (err) { return cb(err) }
            cb(null, ds) // return the stream
          })
        })
      })
    }
  }

  self.registerHandler = function (protocol, handlerFunc) {
    console.log('new handler coming in for - ', protocol)
    if (self.handles[protocol]) {
      console.log('here already - ', protocol)
      return handlerFunc(new Error('Handle for protocol already exists', protocol))
    }
    self.handles.push({ protocol: protocol, func: handlerFunc })
    log.info('Registered handler for protocol:', protocol)
  }

  self.closeConns = function (cb) {
    var keys = Object.keys(self.connections)
    var number = keys.length
    if (number === 0) { cb() }
    var c = new Counter(number, cb)

    keys.map(function (key) {
      c.hit()
      self.connections[key].end()
    })
  }

  self.closeListener = function (cb) {
    self.listener.close(cb)
  }

  function registerHandles (stream) {
    log.info('Registering protocol handlers on new stream')
    console.log('REGISTERING HANDLES')
    errorUp(self, stream)
    var msH = new Select()
    msH.handle(stream)
    self.handles.forEach(function (handle) {
      console.log('  ->', handle.protocol)
      msH.addHandler(handle.protocol, handle.func)
    })
  }

}

function errorUp (self, emitter) {
  emitter.on('error', function (err) {
    self.emit('error', err)
  })
}

function Counter (target, callback) {
  var c = 0
  this.hit = count

  function count () {
    c += 1
    if (c === target) { callback() }
  }
}
