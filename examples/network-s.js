var swarm = require('./../src').singleton

swarm.listen()

swarm.registerHandle('/ipfs/sparkles/1.2.3', function (stream) {
  console.log('woop got a stream')
})
