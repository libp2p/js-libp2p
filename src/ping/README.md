libp2p-ping JavaScript Implementation
=====================================

> IPFS ping protocol JavaScript implementation

## Usage

```javascript
var Ping = require('libp2p-ping')

Ping.mount(swarm) // Enable this peer to echo Ping requests

var p = new Ping(swarm, peerDst) // Ping peerDst, peerDst must be a peer-info object

p.on('ping', function (time) {
  console.log(time + 'ms')
  p.stop() // stop sending pings
})

p.start()
```
