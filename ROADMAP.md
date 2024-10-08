# 🛣️ Roadmap 2024-H2/2025-H1

This roadmap document contains the themes upon which maintainer effort will be concentrated on in 2024/25.

## 👔 Productionization

js-libp2p is deployed in many production environments so to take adoption to the next level we want to really double down on helping these users get the best out of their deployments.

### js-libp2p amino DHT bootstrapper

Deploying a public bootstrapper is a great test of the capacity of js-libp2p since it will need to maintain several thousand simultaneous connections and service many DHT RPC requests.  Comprehensive metrics and logging will also give us insight into real world usage patterns that can further direct performance optimisations.

  - Deploy a bootstrap server that acts as an entry point to the network for DHT clients
  - Ship it in the default config of majority libp2p/IPFS implementations
  - Publish a dashboard showing usage statistics

### Metrics

Having a view on the internal workings of a js-libp2p node is essential to debugging implementation problems as well as user misconfigurations.

  - Add the missing metrics types, e.g. Histograms, Summaries, etc
  - Implement metrics consistently across transports

### DevTools

The [js-libp2p-devtools](https://github.com/libp2p/js-libp2p-devtools) plugin is an invaluable resource for debugging a running libp2p node running [@libp2p/devtools-metrics](https://npmjs.com/package/@libp2p/devtools-metrics).

  - Finish UX improvements
  - Publish to browser extension stores
  - Add DHT capability detection
  - Publish as standalone electron app to connect to Node.js/electron/react-native processes using `@libp2p/devtools-metrics`

### Tuning and reduction of resource usage

JavaScript is a poor choice of language in which to perform computationally expensive operations. Conveniently the ones we need to do (hashing, signing, verification) are largely implemented in native modules or as part of web browser APIs.

  - Profile and benchmark CPU usage
  - Use this to drive further optimizations in resource usage

## 📚 Documentation & developer onboarding

- Documentation refresh - ensure all guides are up to date and follow current best practices
- Revamp getting started guides
  - Focus on use cases
    - Browser vs node
    - Public server vs behind NAT
- Create additional self-directed learning in the style of [@libp2p/protocol-adventure](https://www.npmjs.com/package/@libp2p/protocol-adventure)
  - @libp2p/services-adventure
  - @libp2p/dht-adventure
  - @libp2p/pubsub-adventure
  - @libp2p/peer-discovery-adventure
- Link the adventure modules into a syllabus
- Publish browser based versions using protoschool or https://tutorialkit.dev/

## 🌐 Browser connectivity

Browsers remain the single most challenging environment in which to deploy truly decentralized applications and most of the issues are related to the poor connectivity options presented to browsers by the rest of the network.

### Listen on Secure WebSockets with libp2p.direct

IP Shipyard have recently acquired the ability to create wildcard ACME certificates under the `libp2p.direct` domain.  This feature is being enabled in https://github.com/ipfs/kubo/pull/10521

JS should implement a similar extension to the `@libp2p/websocket` transport to allow config-free SSL encryption.

### WebSocket single encryption

When a browser connects to a WebSocket listener they can only connect over TLS.  We then apply noise encryption as well which means everything is encrypted twice which is inefficient.

We should be able to use the noise handshake mechanism to ensure the remote has the private key corresponding to it's public key, then use the browser's TLS implementation to prevent eavesdropping.

The specification is [in progress](https://github.com/libp2p/specs/pull/625) the milestone is to ship a POC.

### QUIC in Node.js

There's a decent chance the Node.js QUIC implementation is [not going to be exposed to userland](https://github.com/nodejs/node/pull/52628#issuecomment-2143475066), but we need this to have compatibility with other libp2p implementations.

https://github.com/ChainSafe/js-libp2p-quic is in-progress to add QUIC support via a native module that uses the Rust implementation.

### WebTransport in Node.js

A [long-lived PR](https://github.com/libp2p/js-libp2p/pull/2422) is open that adds WebTransport support via the [@fails-components/webtransport](https://www.npmjs.com/package/@fails-components/webtransport) module, however it's blocked on [spec incompatibilities](https://github.com/fails-components/webtransport/issues/213).

We can either resolve these incompatibilities, implement WebTransport on top of https://github.com/ChainSafe/js-libp2p-quic, or perhaps Node.js will finally ship [HTTP3 support](https://github.com/nodejs/node/issues/38478) and WebTransport, whichever is most expedient.
