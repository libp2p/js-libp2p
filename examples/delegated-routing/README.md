# @libp2p/example-delegated-routing-example <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> How to configure libp2p delegated routers

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Prerequisite](#prerequisite)
- [Running this example](#running-this-example)
  - [Finding Content via the Delegate](#finding-content-via-the-delegate)
  - [Finding Peers via the Delegate](#finding-peers-via-the-delegate)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/example-delegated-routing-example
```

The starting [Libp2p Bundle](./src/libp2p-bundle.js) in this example starts by disabling the DHT and adding the Delegated Peer and Content Routers.
Once you've completed the example, you should try enabled the DHT and see what kind of results you get! You can also enable the various Peer Discovery modules and see the impact it has on your Peer count.

## Prerequisite

This example uses a publicly known delegated routing node. This aims to ease experimentation, but you should not rely on this in production.

## Running this example

1. Install IPFS locally if you dont already have it. [Install Guide](https://docs.ipfs.tech/install/)
2. Run the IPFS daemon: `ipfs daemon`
3. In another window output the addresses of the node: `ipfs id`. Make note of the websocket address, it will contain `/ws/` in the address.

- If there is no websocket address, you will need to add it in the ipfs config file (`~/.ipfs/config`)
- Add to Swarm Addresses something like: `"/ip4/127.0.0.1/tcp/4010/ws"`

4. In `./src/App.js` replace `BootstrapNode` with your nodes Websocket address from the step above.
5. Start this example

```sh
npm install
npm start
```

This should open your browser to <http://localhost:3000>. If it does not, go ahead and do that now.

6. Your browser should show you connected to at least 1 peer.

### Finding Content via the Delegate

1. Add a file to your IPFS node. From this example root you can do `ipfs add ./README.md` to add the example readme.
2. Copy the hash from line 5, it will look something like *Qmf33vz4HJFkqgH7XPP1uA6atYKTX1BWQEQthzpKcAdeyZ*.
3. In the browser, paste the hash into the *Hash* field and hit `Find`. The readme contents should display.

This will do a few things:

- The delegate nodes api will be queried to find providers of the content
- The content will be fetched from the providers
- Since we now have the content, we tell the delegate node to fetch the content from us and become a provider

### Finding Peers via the Delegate

1. Get a list of your delegate nodes peer by querying the IPFS daemon: `ipfs swarm peers`
2. Copy one of the CIDs from the list of peer addresses, this will be the last portion of the address and will look something like `QmdoG8DpzYUZMVP5dGmgmigZwR1RE8Cf6SxMPg1SBXJAQ8`.
3. In your browser, paste the CID into the *Peer* field and hit `Find`.
4. You should see information about the peer including its addresses.

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_example_delegated_routing_example.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
