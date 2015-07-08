var swarm = require('./network/swarm')
var Peer = require('./routing/routers/dht/peer')
var Id = require('./routing/routers/dht/peer/id')
var multiaddr = require('multiaddr')

// create Id
// create multiaddr
// create Peer
// openStream

var peerId = Id.create()
var mhs = []
mhs.push(multiaddr('/ip4/127.0.0.1/tcp/4001'))
var p = new Peer(peerId, mhs)

swarm.openStream(p, '/ipfs/sparkles/1.2.3', function (err, stream) {
  if (err) {
    return console.log('ERR - ', err)
  }
  console.log('WoHoo, dialed a stream')
})
