var Swarm = require('./../src')

var Peer = require('peer-info')
var Id = require('peer-id')
var multiaddr = require('multiaddr')
var tcp = require('libp2p-tcp')

var mh = multiaddr('/ip4/127.0.0.1/tcp/8010')
var p = new Peer(Id.create(), [])
var sw = new Swarm(p)

sw.addTransport('tcp', tcp, { multiaddr: mh }, {}, {port: 8010}, function () {
  console.log('transport added')
})
