// var Identify = require('./../src/identify')
var Swarm = require('./../src')
// var Peer = require('ipfs-peer')
// var Id = require('ipfs-peer-id')
// var multiaddr = require('multiaddr')

var b = new Swarm()
b.port = 4001
// var peerB = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + b.port)])

// var i = new Identify(b, peerB)
// i.on('thenews', function (news) {
//   console.log('such news')
// })

b.on('error', function (err) {
  console.log(err)
})

b.listen()

b.registerHandler('/ipfs/sparkles/1.2.3', function (stream) {
  //  if (err) {
  //    return console.log(err)
  //  }

  console.log('woop got a stream')
})
