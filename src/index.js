var EventEmitter = require('events').EventEmitter
var util = require('util')
var read = require('async-buffered-reader')

exports = module.exports = Ping
exports.pingEcho = pingEcho

util.inherits(Ping, EventEmitter)

function Ping (swarm, peer) {
  var self = this
  self.cont = true

  swarm.openStream(peer, '/ipfs/ping/1.0.0', function (err, stream) {
    if (err) {
      return self.emit('error', err)
    }

    var start = new Date()
    var buf = new Buffer(32) // buffer creation doesn't memset the buffer to 0

    stream.write(buf)

    read(stream, 32, gotBack)

    function gotBack (bufBack) {
      var end = new Date()

      if (buf.equals(bufBack)) {
        self.emit('ping', end - start)
      } else {
        stream.end()
        return self.emit('error', new Error('Received wrong ping ack'))
      }

      if (!self.cont) {
        return stream.end()
      }

      start = new Date()
      buf = new Buffer(32)
      stream.write(buf)
      read(stream, 32, gotBack)
    }
  })

  self.stop = function () {
    self.cont = false
  }
}

function pingEcho (swarm) {
  swarm.registerHandler('/ipfs/ping/1.0.0', function (stream) {
    read(stream, 32, echo)

    function echo (buf) {
      stream.write(buf)
      read(stream, 32, echo)
    }

    stream.on('end', function () {
      stream.end()
    })
  })
}
