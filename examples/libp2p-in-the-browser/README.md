# @libp2p/example-libp2p-in-the-browser <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> A libp2p node running in the browser

## Table of contents <!-- omit in toc -->

- [Setup](#setup)
- [Running the examples](#running-the-examples)
- [Going to production?](#going-to-production)
- [License](#license)
- [Contribution](#contribution)

## Setup

In order to run the example:

- Install dependencey at the root of the js-libp2p repository (if not already done),
- then, install the dependencies from same directory as this README:

<!---->

    npm install
    npm run build
    cd ./examples/libp2p-in-the-browser
    npm install

## Running the examples

Start by running the vite server:

    npm start

The output should look something like this:

```log
$ npm start

> libp2p-in-browser@1.0.0 start
> vite index.html

Server running at http://localhost:1234
✨  Built in 1000ms.
```

This will compile the code and start a server listening on port <http://localhost:1234>. Now open your browser to `http://localhost:1234`. You should see a log of your node's Peer ID, the discovered peers from the Bootstrap module, and connections to those peers as they are created.

Now, if you open a second browser tab to `http://localhost:1234`, you should discover your node from the previous tab. This is due to the fact that the `libp2p-webrtc-star` transport also acts as a Peer Discovery interface. Your node will be notified of any peer that connects to the same signaling server you are connected to. Once libp2p discovers this new peer, it will attempt to establish a direct WebRTC connection.

**Note**: In the example we assign libp2p to `window.libp2p`, in case you would like to play around with the API directly in the browser. You can of course make changes to `index.js` and vite will automatically rebuild and reload the browser tabs.

## Going to production?

This example uses public `libp2p-webrtc-star` servers. These servers should be used for experimenting and demos, they **MUST** not be used in production as there is no guarantee on availability.

You can see how to deploy your own signaling server in [libp2p/js-libp2p-webrtc-star/DEPLOYMENT.md](https://github.com/libp2p/js-libp2p-webrtc-star/blob/master/packages/webrtc-star-signalling-server/DEPLOYMENT.md).

Once you have your own server running, you should add its listen address in your libp2p node configuration.

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
