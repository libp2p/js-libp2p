# @libp2p/floodsub

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> libp2p-floodsub, also known as pubsub-flood or just dumbsub, this implementation of pubsub focused on delivering an API for Publish/Subscribe, but with no CastTree Forming (it just floods the network).

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

> Don't use this module

This module is a naive implementation of pubsub. It broadcasts all messages to all network peers, cannot provide older messages and has no protection against bad actors.

It exists for academic purposes only, you should not use it in production.

Instead please use [gossipsub](https://www.npmjs.com/package/@chainsafe/libp2p-gossipsub) - a more complete implementation which is also compatible with floodsub.

## Example - Configuring libp2p to use floodsub

```TypeScript
import { createLibp2p } from 'libp2p'
import { floodsub } from '@libp2p/floodsub'

const node = await createLibp2p({
  services: {
    pubsub: floodsub()
  }
  //... other options
})
await node.start()

node.services.pubsub.subscribe('fruit')
node.services.pubsub.addEventListener('message', (evt) => {
  console.log(evt)
})

node.services.pubsub.publish('fruit', new TextEncoder().encode('banana'))
```

# Install

```console
$ npm i @libp2p/floodsub
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pFloodsub` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/floodsub/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_floodsub.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
