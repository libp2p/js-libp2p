/*
 * Identify is one of the protocols swarms speaks in order to broadcast and learn
 * about the ip:port pairs a specific peer is available through
 */

var Interactive = require('multistream-select').Interactive
var EventEmmiter = require('events').EventEmitter
var util = require('util')

exports = module.exports = Identify

util.inherits(Identify, EventEmmiter)

function Identify (swarm, peerSelf) {
  var self = this

  swarm.registerHandler('/ipfs/identify/1.0.0', function (stream) {
    console.log('DO I EVER GET CALLED?')

    var identifyMsg = {}
    identifyMsg = {}
    identifyMsg.sender = exportPeer(peerSelf)
    // TODO (daviddias) populate with the way I see the other peer
    // identifyMsg.receiver =

    stream.write(JSON.stringify(identifyMsg))

    var answer = ''

    stream.on('data', function (chunk) {
      answer += chunk.toString()
    })

    stream.on('end', function () {
      self.emit('peer-update', answer)
    })

    stream.end()

  // receive their info and how they see us
  // send back our stuff
  })

  swarm.on('connection-unknown', function (conn) {
    console.log('IDENTIFY - DIALING STREAM FROM SERVER')

    conn.on('error', function (err) {
      console.log('CAPUT-A', err)
    })
    conn.dialStream(function (err, stream) {
      if (err) {
        return console.log(err)
      }
      stream.on('error', function (err) {
        console.log('CAPUT-B', err)
      })
      console.log('GOT STREAM')
      var msi = new Interactive()
      msi.handle(stream, function () {
        console.log('HANDLE GOOD')
        msi.select('/ipfs/identify/1.0.0', function (err, ds) {
          if (err) { return console.log(err) }
          var identifyMsg = {}
          identifyMsg = {}
          identifyMsg.sender = exportPeer(peerSelf)
          // TODO (daviddias) populate with the way I see the other peer

          stream.write(JSON.stringify(identifyMsg))

          var answer = ''

          stream.on('data', function (chunk) {
            answer = answer + chunk.toString()
          })

          stream.on('end', function () {
            answer = JSON.parse(answer)

            swarm.connections[answer.sender.id] = conn

            console.log('BAM')
            self.emit('peer-update', answer)
          })

          stream.end()
        })
      })
    })
  // open a spdy stream
  // do the multistream handshake
  // send them our data
  })

  function exportPeer (peer) {
    return {
      id: peer.id.toB58String(),
      multiaddrs: peer.multiaddrs.map(function (mh) {
        return mh.toString()
      })
    }
  }
}
