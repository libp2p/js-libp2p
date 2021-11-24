libp2p-fetch JavaScript Implementation
=====================================

> Libp2p fetch protocol JavaScript implementation

## Overview

An implementation of the Fetch protocol as described here: https://github.com/libp2p/specs/tree/master/fetch

The fetch protocol is a simple protocol for requesting a value corresponding to a key from a peer.

## Usage

```javascript
var Fetch = require('libp2p/src/fetch')

/**
 * Given a key (as a string) returns a value (as a Uint8Array), or null if the key isn't found.
 * @param key - a string
 * @returns value - a Uint8Array value that corresponds to the given key, or null if the key doesn't 
 *   have a corresponding value.
 */
async function lookup(key) {
    // app specific callback to lookup key-value pairs.
}

Fetch.mount(libp2p, lookup) // Enable this peer to respond to fetch requests

const value = await Fetch(libp2p, peerDst, key)

Fetch.unmount(libp2p)
```
