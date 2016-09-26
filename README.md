# js-libp2p-crypto

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-crypto/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-crypto?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-crypto.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-crypto)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-crypto.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-crypto)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Crypto primitives for libp2p in JavaScript

This repo contains the JavaScript implementation of the crypto primitives
needed for libp2p. This is based on this [go implementation](https://github.com/ipfs/go-libp2p-crypto).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Example](#example)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
npm install --save libp2p-crypto
```

## Usage

### Example

```js
const crypto = require('libp2p-crypto')

crypto.generateKeyPair('RSA', 2048, (err, key) => {
})
```

## API

See [API.md](API.md)

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-libp2p-crypto/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
