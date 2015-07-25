var Id = require('ipfs-peer-id')
var Peer = require('ipfs-peer')
var Swarm = require('ipfs-swarm')
var Sonar = require('./../src')
var multiaddr = require('multiaddr')

var s = new Swarm()
var p = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + s.port)])

var snr = new Sonar(p, {verify: false}, s)

snr.on('peer', function (peer) {
  console.log('got peer')
})
