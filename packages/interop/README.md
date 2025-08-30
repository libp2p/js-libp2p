# @libp2p/interop

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/interop.svg?style=flat-square)](https://codecov.io/gh/libp2p/interop)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/interop/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/libp2p/interop/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> Interoperability Tests for libp2p

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

This repository holds interop tests for testing compatibility between different libp2p implementations.

## Example - How to run the tests

Create a js file that configures the different types of daemon:

```js
import { interopTests } from '@libp2p/interop'
import type { Daemon, DaemonFactory } from '@libp2p/interop'

async function createGoPeer (options: SpawnOptions): Promise<Daemon> {
  // your implementation here
}

async function createJsPeer (options: SpawnOptions): Promise<Daemon> {
  // your implementation here
}

async function main () {
  const factory: DaemonFactory = {
    async spawn (options: SpawnOptions) {
      if (options.type === 'go') {
        return createGoPeer(options)
      }

      return createJsPeer(options)
    }
  }

  interopTests(factory)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

For an example, see the js-libp2p interop test runner.

# Install

```console
$ npm i @libp2p/interop
```

# API Docs

- <https://libp2p.github.io/interop>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/interop/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/interop/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
