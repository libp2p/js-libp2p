libp2p-ping JavaScript Implementation
=====================================

> IPFS ping protocol JavaScript implementation

**Note**: git history prior to merging into js-libp2p can be found in the original repository, https://github.com/libp2p/js-libp2p-ping.

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
