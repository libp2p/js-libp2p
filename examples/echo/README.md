# @libp2p/example-echo <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> An example echo app

## Table of contents <!-- omit in toc -->

- [Setup](#setup)
- [Running](#running)
- [License](#license)
- [Contribution](#contribution)

## Setup

1. Install the modules from libp2p root, `npm install` and `npm run build`.
2. Open 2 terminal windows in the `./src` directory.

## Running

1. Run the listener in window 1, `node listener.js`
2. Run the dialer in window 2, `node dialer.js`
3. You should see console logs showing the dial, and the received echo of *hey*
4. If you look at the listener window, you will see it receiving the dial

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
