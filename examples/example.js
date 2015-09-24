var Id = require('peer-id')
var Peer = require('peer-info')
var Swarm = require('libp2p-swarm')
var Sonar = require('./../src')
var multiaddr = require('multiaddr')
var tcp = require('libp2p-tcp')

var mh = multiaddr('/ip4/127.0.0.1/tcp/8010')
var p = new Peer(Id.create(), [])
var sw = new Swarm(p)

sw.addTransport('tcp', tcp, { multiaddr: mh }, {}, {port: 8010}, function () {
  var snr = new Sonar(p, {verify: false}, sw)

  snr.on('peer', function (peer) {
    console.log('Found a peer, woot! :', peer.id.toB58String())
  })
})
