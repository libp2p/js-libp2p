js-libp2p-pnet <!-- omit in toc -->
==================

> Connection protection management for libp2p leveraging PSK encryption via XSalsa20.

**Note**: git history prior to merging into js-libp2p can be found in the original repository, https://github.com/libp2p/js-libp2p-pnet.

## Table of Contents <!-- omit in toc -->

- [Usage](#usage)
- [Examples](#examples)
- [Private Shared Keys](#private-shared-keys)
- [PSK Generation](#psk-generation)
    - [From a module using libp2p](#from-a-module-using-libp2p)
    - [Programmatically](#programmatically)

## Usage

```js
import { createLibp2p } from 'libp2p'
import { preSharedKey, generateKey } from 'libp2p/pnet'

// Create a Uint8Array and write the swarm key to it
const swarmKey = new Uint8Array(95)
generateKey(swarmKey)

const node = await createLibp2p({
  // ...other options
  connectionProtector: preSharedKey({
    psk: swarmKey
  })
})
```

## Examples
[Private Networks with IPFS](../../examples/pnet-ipfs)

## Private Shared Keys

Private Shared Keys are expected to be in the following format:

```
/key/swarm/psk/1.0.0/
/base16/
dffb7e3135399a8b1612b2aaca1c36a3a8ac2cd0cca51ceeb2ced87d308cac6d
```

## PSK Generation

A utility method has been created to generate a key for your private network. You can
use one of the methods below to generate your key.

#### From a module using libp2p

If you have a module locally that depends on libp2p, you can run the following from
that project, assuming the node_modules are installed.

```console
node -e "import('libp2p/pnet').then(({ generateKey }) => generateKey(process.stdout))" > swarm.key
```

#### Programmatically

```js
import fs from 'fs'
import { generateKey } from 'libp2p/pnet'

const swarmKey = new Uint8Array(95)
generateKey(swarmKey)

fs.writeFileSync('swarm.key', swarmKey)
```
