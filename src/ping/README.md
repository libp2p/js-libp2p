libp2p-ping JavaScript Implementation
=====================================

> IPFS ping protocol JavaScript implementation

**Note**: git history prior to merging into js-libp2p can be found in the original repository, https://github.com/libp2p/js-libp2p-ping.

## Usage

```javascript
var Ping = require('libp2p/src/ping')

Ping.mount(libp2p) // Enable this peer to echo Ping requests

const latency = await Ping(libp2p, peerDst)

Ping.unmount(libp2p)
```
