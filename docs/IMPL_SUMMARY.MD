# js-libp2p-kad-dht <!-- omit in toc -->

js-libp2p-kad-dht is a JavaScript implementation of the [Kademlia DHT][] with some features of [S/Kademlia][]. A "provider" node uses the DHT to advertise that it has a particular piece of content, and "querying" nodes will search the DHT for peers that have a particular piece of content. Content is modelled as a value that is identified by a key, where the key and value are Uint8Arrays.

## Table of contents <!-- omit in toc -->

- [Spec](#spec)
- [Extensions](#extensions)
  - [Disjoint paths](#disjoint-paths)

## Spec

js-libp2p-kad-dht follows the [libp2p/kad-dht spec](https://github.com/libp2p/specs/tree/master/kad-dht) and implements the algorithms described in the [IPFS DHT documentation](https://docs.ipfs.io/concepts/dht/).

## Extensions

js-libp2p-kad-dht implements some additional functionality not described in the libp2p KAD-DHT spec.

### Disjoint paths

js-libp2p-kad-dht uses disjoint paths when performing DHT queries. These are described in the [S/Kademlia][] paper.

[Kademlia DHT]: (http://www.scs.stanford.edu/%7Edm/home/papers/kpos.pdf)
[S/Kademlia]: (https://git.gnunet.org/bibliography.git/plain/docs/SKademlia2007.pdf)
[PeerId]: https://github.com/libp2p/js-peer-id
[PeerInfo]: https://github.com/libp2p/js-peer-info
