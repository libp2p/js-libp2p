libp2p-fetch JavaScript Implementation
=====================================

> Libp2p fetch protocol JavaScript implementation

## Overview

An implementation of the Fetch protocol as described here: https://github.com/libp2p/specs/tree/master/fetch

The fetch protocol is a simple protocol for requesting a value corresponding to a key from a peer.

## Usage

```javascript
const Libp2p = require('libp2p')

/**
 * Given a key (as a string) returns a value (as a Uint8Array), or null if the key isn't found.
 * All keys must be prefixed my the same prefix, which will be used to find the appropriate key
 * lookup function.
 * @param key - a string
 * @returns value - a Uint8Array value that corresponds to the given key, or null if the key doesn't
 *   have a corresponding value.
 */
async function my_subsystem_key_lookup(key) {
    // app specific callback to lookup key-value pairs.
}

// Enable this peer to respond to fetch requests for keys that begin with '/my_subsystem_key_prefix/'
const libp2p = Libp2p.create(...)
libp2p.fetchService.registerLookupFunction('/my_subsystem_key_prefix/', my_subsystem_key_lookup)

const key = '/my_subsystem_key_prefix/{...}'
const peerDst = PeerId.parse('Qmfoo...') // or Multiaddr instance
const value = await libp2p.fetch(peerDst, key)
```
