# Rendezvous Protocol in js-libp2p

The rendezvous protocol can be used in different contexts across libp2p. For using it, the libp2p network needs to have well known libp2p nodes acting as rendezvous servers. These nodes will have an extra role in the network. They will collect and maintain a list of registrations per rendezvous namespace. Other peers in the network will act as rendezvous clients and will register themselves on given namespaces by messaging a rendezvous server node. Taking into account these registrations, a rendezvous client is able to discover other peers in a given namespace by querying a server. A registration should have a `ttl`, in order to avoid having invalid registrations.

An example of a namespace could be a relay namespace, so that undialable nodes can register themselves as reachable through that relay.

## Usage

`js-libp2p` supports the usage of the rendezvous protocol through its configuration. It allows the rendezvous protocol to be enabled and customized. You will need to setup a rendezvous server, which will be used by rendezvous client nodes. You can see how to setup a rendezvous server in [libp2p/js-libp2p-rendezvous](https://github.com/libp2p/js-libp2p-rendezvous)

You can configure it through libp2p as follows:

```js
const Libp2p = require('libp2p')
const node = await Libp2p.create({
  rendezvous: {
    enabled: true,
    rendezvousPoints: ['/dnsaddr/rendezvous.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJP']
  }
})
```

## Libp2p Flow

Every time a rendezvous operation is performed through libpsp's API, libp2p will attempt to connect to the given rendezvous servers and exchange the appropriate rendezvous protocol per the [spec](https://github.com/libp2p/specs/tree/master/rendezvous).

## Future Work

- Libp2p can handle re-registers when properly configured
  - Libp2p automatically unregisters previously registered namespaces on stop.
- Rendezvous client should be able to register namespaces given in configuration on startup
  - Not supported at the moment, as we would need to deal with re-register over time