# Delegate Nodes with IPFS

This document aims to guide the setup of a delegate node in the IPFS/libp2p network. It is recommended that you look into the [Delegated Routing with Libp2p and IPFS](../examples/deledated-routing) example first. This example describes how to use the public delegate nodes available for demos and experiments.

## Table of Contents

* [Delegate Nodes with IPFS](#delegate-nodes-with-ipfs)
  * [Setup a local go-ipfs node as a Delegate Node for the example](#setup-a-local-go-ipfs-node-as-a-delegate-node-for-the-example)
  * [Setup a remote go-ipfs node as a Delegate Node for the example](#setup-a-remote-go-ipfs-node-as-a-delegate-node-for-the-example)
  * [Setup a remote go-ipfs node as a Delegate Node for js-ipfs](#setup-a-remote-go-ipfs-node-as-a-delegate-node-for-js-ipfs)

## Setup a local go-ipfs node as a Delegate Node for the example

The simplest first step before going into production is to setup a delegate node locally and try it out in the [Delegated Routing with Libp2p and IPFS](../examples/deledated-routing) example.

Taking into account the browser policies regarding CORS, proper HTTP headers must be configured in `go-ipfs`.

1. Install `go-ipfs` locally, if you don't have it already. Check the [Install Guidelines](https://github.com/ipfs/go-ipfs/#install).
2. Configure HTTP headers for access control

```sh
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST"]'
```

Bear in mind that this allows access to any origin. You might want to control the allowed origins.

3. Start your `go-ipfs` daemon.

```sh
ipfs daemon
```

The daemon will output a line about its API address, like `API server listening on /ip4/127.0.0.1/tcp/5001`

4. Modify the example `libp2p-configuration` to use the local `go-ipfs` node API

```js
const delegatedApiOptions = {
  protocol: 'http',
  port: 5001,
  host: '127.0.0.1'
}
```

5. Start the example and retry its flows. You should have your browser node leveraging the delegate `go-ipfs` node for `content-routing` and `peer-routing`.

## Setup a remote go-ipfs node as a Delegate Node for the example

1. Install `go-ipfs`. Check the [Install Guidelines](https://github.com/ipfs/go-ipfs/#install).
2. Configure HTTP headers for access control

```sh
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST"]'
```

Bear in mind that this allows access to any origin. You might want to control the allowed origins.

3. Start your `go-ipfs` daemon.

4. Expose the API to the outside world. You should setup an SSL certificate with nginx and proxy to the API. You can use a service that already offers an SSL certificate with the server and configure nginx, or you can create valid certificates with for example [Letsencrypt](https://certbot.eff.org/lets-encrypt/osx-nginx). Letsencrypt won’t give you a cert for an IP address (yet) so you need to connect via SSL to a domain name.

5. Modify the example `libp2p-configuration` to use the remote `go-ipfs` node host name.

6. Start the example and retry its flows.

## Setup a remote go-ipfs node as a Delegate Node for js-ipfs

You should follow all the steps mentioned for the setup of a remote go-ipfs for the libp2p example, except for the integration with the example.

5. You should add your delegate multiaddr to the `js-ipfs` config file as follows:

```js
Addresses: {
  Delegates: [
    '/dns4/node0.mydelegatenode.io/tcp/443/https',
    '/dns4/node1.mydelegatenode.io/tcp/443/https',
    '/dns4/node2.mydelegatenode.io/tcp/443/https',
    '/dns4/node3.mydelegatenode.io/tcp/443/https'
  ]
},
```
