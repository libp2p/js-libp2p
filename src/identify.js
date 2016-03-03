/*
 * Identify is one of the protocols swarms speaks in order to broadcast and learn
 * about the ip:port pairs a specific peer is available through
 */

var Interactive = require('multistream-select').Interactive
var protobufs = require('protocol-buffers-stream')
var fs = require('fs')
var path = require('path')
var schema = fs.readFileSync(path.join(__dirname, '/identify.proto'))
var Address6 = require('ip-address').Address6
var Id = require('peer-id')
var multiaddr = require('multiaddr')

exports = module.exports = identify

var protoId = '/ipfs/identify/1.0.0'

exports.protoId = protoId
var createProtoStream = protobufs(schema)

function identify (muxedConns, peerInfoSelf, socket, conn, muxer) {
  var msi = new Interactive()
  msi.handle(conn, function () {
    msi.select(protoId, function (err, ds) {
      if (err) {
        return console.log(err) // TODO Treat error
      }

      var ps = createProtoStream()

      ps.on('identify', function (msg) {
        var peerId = Id.createFromPubKey(msg.publicKey)

        updateSelf(peerInfoSelf, msg.observedAddr)

        muxedConns[peerId.toB58String()] = {
          muxer: muxer,
          socket: socket
        }

      // TODO: Pass the new discovered info about the peer that contacted us
      // to something like the Kademlia Router, so the peerInfo for this peer
      // is fresh
      //   - before this was exectued through a event emitter
      // self.emit('peer-update', {
      //   peerId: peerId,
      //   listenAddrs: msg.listenAddrs.map(function (mhb) {return multiaddr(mhb)})
      // })
      })

      var mh = getMultiaddr(socket)

      ps.identify({
        protocolVersion: 'na',
        agentVersion: 'na',
        publicKey: peerInfoSelf.id.pubKey,
        listenAddrs: peerInfoSelf.multiaddrs.map(function (mh) {
          return mh.buffer
        }),
        observedAddr: mh.buffer
      })

      ps.pipe(ds).pipe(ps)
      ps.finalize()
    })
  })
}

exports.getHandlerFunction = function (peerInfoSelf, muxedConns) {
  return function (conn) {
    // wait for the other peer to identify itself
    // update our multiaddr with observed addr list
    // then get the socket from our list of muxedConns and send the reply back

    var ps = createProtoStream()

    ps.on('identify', function (msg) {
      updateSelf(peerInfoSelf, msg.observedAddr)

      var peerId = Id.createFromPubKey(msg.publicKey)

      var socket = muxedConns[peerId.toB58String()].socket

      var mh = getMultiaddr(socket)

      ps.identify({
        protocolVersion: 'na',
        agentVersion: 'na',
        publicKey: peerInfoSelf.id.pubKey,
        listenAddrs: peerInfoSelf.multiaddrs.map(function (mh) {
          return mh.buffer
        }),
        observedAddr: mh.buffer
      })

      // TODO: Pass the new discovered info about the peer that contacted us
      // to something like the Kademlia Router, so the peerInfo for this peer
      // is fresh
      //   - before this was exectued through a event emitter
      // self.emit('peer-update', {
      //   peerId: peerId,
      //   listenAddrs: msg.listenAddrs.map(function (mhb) {
      //     return multiaddr(mhb)
      //   })
      // })

      ps.finalize()
    })
    ps.pipe(conn).pipe(ps)
  }
}

function getMultiaddr (socket) {
  var mh
  if (socket.remoteFamily === 'IPv6') {
    var addr = new Address6(socket.remoteAddress)
    if (addr.v4) {
      var ip4 = addr.to4().correctForm()
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
      peerSelf.previousObservedAddrs.splice(i, 1)
      addToSelf()
      return
    }
  }

  peerSelf.previousObservedAddrs.push(omh)

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
