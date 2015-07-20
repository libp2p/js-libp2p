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
var v6 = require('ip-address').v6
var Id = require('ipfs-peer-id')
var multiaddr = require('multiaddr')

exports = module.exports = Identify

util.inherits(Identify, EventEmmiter)

function Identify (swarm, peerSelf) {
  var self = this
  self.createProtoStream = protobufs(schema)

  swarm.registerHandler('/ipfs/identify/1.0.0', function (stream) {
    var ps = self.createProtoStream()

    ps.on('identify', function (msg) {
      updateSelf(peerSelf, msg.observedAddr)

      var peerId = Id.createFromPubKey(msg.publicKey)

      var socket = swarm.connections[peerId.toB58String()].socket
      var mh = getMultiaddr(socket)
      ps.identify({
        protocolVersion: 'na',
        agentVersion: 'na',
        publicKey: peerSelf.id.pubKey,
        listenAddrs: peerSelf.multiaddrs.map(function (mh) {return mh.buffer}),
        observedAddr: mh.buffer
      })

      self.emit('peer-update', {
        peerId: peerId,
        listenAddrs: msg.listenAddrs.map(function (mhb) {return multiaddr(mhb)})
      })

      ps.finalize()
    })
    ps.pipe(stream).pipe(ps)
  })

  swarm.on('connection-unknown', function (conn, socket) {
    conn.dialStream(function (err, stream) {
      if (err) { return console.log(err) }
      var msi = new Interactive()
      msi.handle(stream, function () {
        msi.select('/ipfs/identify/1.0.0', function (err, ds) {
          if (err) { return console.log(err) }

          var ps = self.createProtoStream()

          ps.on('identify', function (msg) {
            // console.log('RECEIVED PROTOBUF - SIDE ZZ ', msg)
            var peerId = Id.createFromPubKey(msg.publicKey)

            updateSelf(peerSelf, msg.observedAddr)

            swarm.connections[peerId.toB58String()] = {
              conn: conn,
              socket: socket
            }

            self.emit('peer-update', {
              peerId: peerId,
              listenAddrs: msg.listenAddrs.map(function (mhb) {return multiaddr(mhb)})
            })
          })

          var mh = getMultiaddr(socket)

          ps.identify({
            protocolVersion: 'na',
            agentVersion: 'na',
            publicKey: peerSelf.id.pubKey,
            listenAddrs: peerSelf.multiaddrs.map(function (mh) {return mh.buffer}),
            observedAddr: mh.buffer
          })

          ps.pipe(ds).pipe(ps)
          ps.finalize()
        })
      })
    })
  })
}

function getMultiaddr (socket) {
  var mh
  if (~socket.remoteAddress.indexOf(':')) {
    var addr = new v6.Address(socket.remoteAddress)
    if (addr.v4) {
      var ip4 = socket.remoteAddress.split(':')[3]
      mh = multiaddr('/ip4/' + ip4 + '/tcp/' + socket.remotePort)
    } else {
      mh = multiaddr('/ip6/' + socket.remoteAddress + '/tcp/' + socket.remotePort)
    }
  } else {
    mh = multiaddr('/ip4/' + socket.remoteAddress + '/tcp/' + socket.remotePort)
  }
  return mh
}

function updateSelf (peerSelf, observedAddr) {
  var omh = multiaddr(observedAddr)

  if (!peerSelf.previousObservedAddrs) {
    peerSelf.previousObservedAddrs = []
  }

  for (var i = 0; i < peerSelf.previousObservedAddrs.length; i++) {
    if (peerSelf.previousObservedAddrs[i].toString() === omh.toString()) {
      peerSelf.previousObserveredAddrs.splice(i, 1)
      addToSelf()
      return
    }
  }

  peerSelf.previousObservedAddrs.push(observedAddr)

  function addToSelf () {
    var isIn = false
    peerSelf.multiaddrs.forEach(function (mh) {
      if (mh.toString() === omh.toString()) {
        isIn = true
      }
    })

    if (!isIn) {
      peerSelf.multiaddrs.push(omh)
    }
  }
}
