'use strict'

var Swarm = require('libp2p-swarm')
var tcp = require('libp2p-tcp')
var multiaddr = require('multiaddr')
var Id = require('peer-id')
var Spdy = require('libp2p-spdy')
var Libp2p = require('../../src')
var Peer = require('peer-info')

// set up

var mh = multiaddr('/ip4/127.0.0.1/tcp/8010')
var p = new Peer(Id.create(), [])
var sw = new Swarm(p)

// create a libp2p node

var node = new Libp2p(sw)

node.swarm.addTransport('tcp', tcp, {multiaddr: mh}, {}, {port: 8010}, function () {
  // Ready to receive incoming connections

  sw.addStreamMuxer('spdy', Spdy, {})

  // dial to another node

  var mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
  var p2 = new Peer(Id.create(), [mh2])

  node.swarm.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
    if (err) {
      return console.error(err)
    }

    console.log('-> connection is ready')
    process.stdin.pipe(conn).pipe(process.stdout)
  })
})
