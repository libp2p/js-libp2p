js-libp2p-pnet
==================

> Connection protection management for libp2p leveraging PSK encryption via XSalsa20.

**Note**: git history prior to merging into js-libp2p can be found in the original repository, https://github.com/libp2p/js-libp2p-pnet.

## Table of Contents

- [js-libp2p-pnet](#js-libp2p-pnet)
  - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
    - [Examples](#examples)
    - [Private Shared Keys](#private-shared-keys)
    - [PSK Generation](#psk-generation)
      - [From libp2p-pnet](#from-libp2p-pnet)
      - [From a module using libp2p](#from-a-module-using-libp2p)
      - [Programmatically](#programmatically)

## Usage

```js
const Protector = require('libp2p-pnet')
const protector = new Protector(swarmKeyBuffer)
const privateConnection = protector.protect(myPublicConnection, (err) => { })
```

### Examples
[Private Networks with IPFS](../../examples/pnet-ipfs)

### Private Shared Keys

Private Shared Keys are expected to be in the following format:

```
/key/swarm/psk/1.0.0/
/base16/
dffb7e3135399a8b1612b2aaca1c36a3a8ac2cd0cca51ceeb2ced87d308cac6d
```

### PSK Generation

A utility method has been created to generate a key for your private network. You can
use one of the methods below to generate your key.

#### From libp2p-pnet

If you have libp2p locally, you can run the following from the projects root.

```sh
node ./src/pnet/key-generator.js > swarm.key
```

#### From a module using libp2p

If you have a module locally that depends on libp2p, you can run the following from
that project, assuming the node_modules are installed.

```sh
node -e "require('libp2p/src/pnet').generate(process.stdout)" > swarm.key
```

#### Programmatically

```js
const writeKey = require('libp2p/src/pnet').generate
const swarmKey = new Uint8Array(95)
writeKey(swarmKey)
fs.writeFileSync('swarm.key', swarmKey)
```
