'use strict'

var Swarm = require('libp2p-swarm')
var tcp = require('libp2p-tcp')
var multiaddr = require('multiaddr')
var Id = require('peer-id')
var Spdy = require('libp2p-spdy')
var Libp2p = require('../../src')
var Peer = require('peer-info')

// set up

var mh = multiaddr('/ip4/127.0.0.1/tcp/8020')
var p = new Peer(Id.create(), [])
var sw = new Swarm(p)

sw.addTransport('tcp', tcp, {multiaddr: mh}, {}, {port: 8020}, function () {
  // Ready to receive incoming connections

  sw.addStreamMuxer('spdy', Spdy, {})

  // create a libp2p node

  var node = new Libp2p(sw)

  // handle/mount a protocol

  node.swarm.handleProtocol('/sparkles/1.0.0', function (conn) {
    process.stdin.pipe(conn).pipe(process.stdout)
  })
})
