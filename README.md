# js-libp2p-utils

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-utils.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-utils)
[![](https://img.shields.io/travis/libp2p/js-libp2p-utils.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-utils)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-utils.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utils)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> This package serves as a central repository for shared logic and dependencies for all libp2p packages, using `libp2p-utils` helps to easily re-use small scoped blocks of logic across all libp2p modules and also as a dependency proxy (think `aegir` for domain logic dependencies).


The libp2p ecosystem has lots of repos with it comes several problems like: 
- Domain logic dedupe - all modules shared a lot of logic like validation, streams handling, etc.
- Dependencies management - it's really easy with so many repos for dependencies to go out of control, they become outdated, different repos use different modules to do the same thing (like merging defaults options), browser bundles ends up with multiple versions of the same package, bumping versions is cumbersome to do because we need to go through several repos, etc.

These problems are the motivation for this package, having shared logic in this package avoids creating cyclic dependencies, centralizes common use modules/functions (exactly like aegir does for the tooling), semantic versioning for 3rd party dependencies is handled in one single place (a good example is going from streams 2 to 3) and maintainers should only care about having `libp2p-utils` updated.

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos)

## Install


```bash
$ npm install --save libp2p-utils
```

## Usage
Each function should be imported directly.

```js
const ipAndPortToMultiaddr = require('libp2p-utils/src/ip-port-to-multiaddr')

const ma = ipAndPortToMultiaddr('127.0.0.1', 9000)
```

You can check the [API docs](./API.md).

## Contribute

Contributions welcome. Please check out [the issues](https://github.com/libp2p/js-libp2p-utils/issues).

Check out our [contributing document](https://github.com/ipfs/community/blob/master/contributing.md) for more information on how we work, and about contributing in general. Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

## License

[MIT](LICENSE) © Protocol Labs Inc.
