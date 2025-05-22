# @libp2p/config

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Helper functions to make dealing with libp2p config easier

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

Utilities to make working with libp2p configuration simpler.

## Example - Load or create the "self" private key in a datastore

Most nodes will want to persist the same private key between restarts so this
function helps you extract one from a datastore if it exists, otherwise it
will create a new one and save it in the keystore.

The options you pass to this function should be the same as those passed to
the `@libp2p/keychain` service you configure your node with.

```TypeScript
import { loadOrCreateSelfKey } from '@libp2p/config'
import { keychain } from '@libp2p/keychain'
import { LevelDatastore } from 'datastore-level'
import { createLibp2p } from 'libp2p'

const datastore = new LevelDatastore('/path/to/db')
await datastore.open()

const keychainInit = {
 pass: 'yes-yes-very-secure'
}

const privateKey = await loadOrCreateSelfKey(datastore, keychainInit)

const node = await createLibp2p({
  privateKey,
  datastore,
  services: {
    keychain: keychain(keychainInit)
  }
})
```

# Install

```console
$ npm i @libp2p/config
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_config.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/config/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/config/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
