/*
 * Identify is one of the protocols swarms speaks in order to broadcast and learn
 * about the ip:port pairs a specific peer is available through
 */

var Interactive = require('multistream-select').Interactive
var EventEmmiter = require('events').EventEmitter
var util = require('util')
var protobufs = require('protocol-buffers-stream')
var fs = require('fs')
var schema = fs.readFileSync(__dirname + '/identify.proto')

exports = module.exports = Identify

util.inherits(Identify, EventEmmiter)

function Identify (swarm, peerSelf) {
  var self = this
  self.createProtoStream = protobufs(schema)

  swarm.registerHandler('/ipfs/identify/1.0.0', function (stream) {
    var ps = self.createProtoStream()

    ps.on('identify', function (msg) {
      console.log('RECEIVED PROTOBUF - ', msg)
      // 1. wrap the msg
      // 2. create a Peer obj using the publick key to derive the ID
      // 3. populate it with observedAddr
      // 4. maybe emit 2 peers update to update the other peer and also ourselfs?
      self.emit('peer-update', {})
    })

    ps.identify({
      protocolVersion: 'na',
      agentVersion: 'na',
      publicKey: peerSelf.id.pubKey,
      listenAddrs: peerSelf.multiaddrs
    // observedAddr: new Buffer()
    })

    ps.pipe(stream).pipe(ps)

  // TODO(daviddias) ps.end() based on https://github.com/mafintosh/protocol-buffers-stream/issues/1
  })

  swarm.on('connection-unknown', function (conn) {
    conn.dialStream(function (err, stream) {
      if (err) { return console.log(err) }
      var msi = new Interactive()
      msi.handle(stream, function () {
        msi.select('/ipfs/identify/1.0.0', function (err, ds) {
          if (err) { return console.log(err) }

          var ps = self.createProtoStream()

          ps.on('identify', function (msg) {
            console.log('RECEIVED PROTOBUF - ', msg)
            // 1. wrap the msg
            // 2. create a Peer obj using the publick key to derive the ID
            // 3. populate it with observedAddr
            // 4. maybe emit 2 peers update to update the other peer and also ourselfs?
            // 5. add the conn to connections list -> swarm.connections[otherPeerId] = conn
            self.emit('peer-update', {})
          })

          ps.identify({
            protocolVersion: 'na',
            agentVersion: 'na',
            publicKey: peerSelf.id.pubKey,
            listenAddrs: peerSelf.multiaddrs
          // observedAddr: new Buffer()
          })

          ps.pipe(ds).pipe(ps)

        // TODO(daviddias) ps.end() based on https://github.com/mafintosh/protocol-buffers-stream/issues/1
        })
      })
    })
  })
}
