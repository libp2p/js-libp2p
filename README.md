js-libp2p-floodsub
==================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-floodsub/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-floodsub?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-floodsub.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-floodsub)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-floodsub.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-floodsub)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-floodsub) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![](https://img.shields.io/badge/pm-waffle-yellow.svg?style=flat-square)](https://waffle.io/libp2p/js-libp2p-floodsub)

> libp2p-floodsub, also known as pubsub-flood or just dumbsub, this implementation of pubsub focused on delivering an API for Publish/Subscribe, but with no CastTree Forming (it just floods the network).


## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
> npm install libp2p-floodsub
```

## Examples

```JavaScript
const FloodSub = require('libp2p-floodsub')

const fsub = new FloodSub(node)

fsub.start((err) => {
  if (err) {
    console.log('Upsy', err)
  }
  fsub.on('fruit', (data) => {
    console.log(data)
  })
  fsub.subscribe('fruit')

  fsub.publish('fruit', new Buffer('banana'))
})
```

## API

See https://libp2p.github.io/js-libp2p-floodsub

## Contribute

PRs are welcome!

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © David Dias
