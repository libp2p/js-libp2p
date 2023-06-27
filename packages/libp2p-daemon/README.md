# @libp2p/daemon <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-daemon.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-daemon)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-daemon/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-daemon/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> libp2p-daemon JavaScript implementation

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Specs](#specs)
- [Usage](#usage)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/daemon
```

## Specs

The specs for the daemon are currently housed in the go implementation. You can read them at [libp2p/go-libp2p-daemon](https://github.com/libp2p/go-libp2p-daemon/blob/master/specs/README.md)

## Usage

```console
$ jsp2pd --help
```

For a full list of options, you can run help `jsp2pd --help`.
Running the defaults, `jsp2pd`, will start the daemon and bind it to a local unix socket path.
Daemon clients will be able to communicate with the daemon over that unix socket.

As an alternative, you can use this daemon with a different version of libp2p as the one specified in `package.json`. You just need to define its path through an environment variable as follows:

```console
$ LIBP2P_JS=/path/to/js-libp2p/src/index.js jsp2pd
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
