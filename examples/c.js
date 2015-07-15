// var Identify = require('./../src/identify')
var Swarm = require('./../src')
var Peer = require('ipfs-peer')
var Id = require('ipfs-peer-id')
var multiaddr = require('multiaddr')

var a = new Swarm()
a.port = 4000
// a.listen()
// var peerA = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + a.port)])

// attention, peerB Id isn't going to match, but whateves
var peerB = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/4001')])

// var i = new Identify(a, peerA)
// i.on('thenews', function (news) {
//   console.log('such news')
// })

a.openStream(peerB, '/ipfs/sparkles/1.2.3', function (err, stream) {
  if (err) {
    return console.log(err)
  }
  console.log('WoHoo, dialed a stream')
})
