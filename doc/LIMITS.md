# Limits <!-- omit in toc -->

In order to prevent excessive resource consumption by a libp2p node it's important to understand limits are applied and how to tune them to the needs of your application.

## Table of contents <!-- omit in toc -->

- [Connection limits](#connection-limits)
- [Inbound connection threshold](#inbound-connection-threshold)
- [Data transfer and Event Loop limits](#data-transfer-and-event-loop-limits)
- [Stream limits](#stream-limits)
  - [Mplex](#mplex)
  - [Yamux](#yamux)
  - [Protocol limits](#protocol-limits)
- [Closing connections](#closing-connections)
- [Transport specific limits](#transport-specific-limits)
  - [TCP](#tcp)
- [Allow/deny lists](#allowdeny-lists)

## Connection limits

It's possible to limit the amount of incoming and outgoing connections a node is able to make.  When this limit is reached and an attempt to open a new connection is made, existing connections may be closed to make room for the new connection.

We can also limit the number of connections in a "pending" state. These connections have been opened by a remote peer but peer IDs have yet to be exchanged and/or connection encryption and multiplexing negotiated. Once this limit is hit further connections will be closed unless the remote peer has an address in the [allow list](#allowdeny-lists).

```js
const node = await createLibp2pNode({
  connectionManager: {
    /**
     * The total number of connections allowed to be open at one time
     */
    maxConnections: 200,

    /**
     * If the number of open connections goes below this number, the node
     * will try to connect to nearby peers from the peer store
     */
    minConnections: 20,

    /**
     * How many connections can be open but not yet upgraded
     */
    maxIncomingPendingConnections: 10
  }
})
```

## Inbound connection threshold

To prevent individual peers from opening multiple connections to a node, an `inboundConnectionThreshold` is configurable. This is the number of connections per second an individual remote host can open to a node, once this threshold is crossed all further connections opened by that host will be rejected.


```js
const node = await createLibp2pNode({
  connectionManager: {
    /**
     * A remote peer may attempt to open up to this many connections per second,
     * any more than that will be automatically rejected
     */
    inboundConnectionThreshold: 5
  }
})
```

## Data transfer and Event Loop limits

If metrics are enabled the node will track the amount of data being sent to and from the network. If the amount sent is over the threshold connections will be trimmed to free up resources.  The default amount is `Ininity` so this must be explicitly enabled.

Connections may also be trimmed if [event loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick) latency exceeds the configured limit.

```js
const node = await createLibp2pNode({
  metrics: {
    enabled: true
  },
  connectionManager: {
    /**
     * If the node transfers more than this amount of data in bytes/second
     * low value connections may be closed
     */
    maxData: 1024 * 1024,

    /**
     * If the node sends more than this amount of data in bytes/second
     * low value connections may be closed
     */
    maxSentData: 1024 * 1024

    /**
     * If the node receives more than this amount of data in bytes/second
     * low value connections may be closed
     */
    maxReceivedData: 1024 * 1024,

    /**
     * If the event loop takes longer than this many ms to run,  low value
     * connections may be closed
     */
    maxEventLoopDelay: 1000
  }
})
```

## Stream limits

libp2p stream multiplexers impose limits on the amount of streams that can be opened per connection, and also the amount of data that will be buffered for a given stream. The data should be consumed as fast as possible - if a stream's input buffer exceeds the limits set the stream will be reset.

These settings are done on a per-muxer basis, please see the README of the relevant muxer you are using.

### Mplex

[@libp2p/mplex](https://github.com/libp2p/js-libp2p-mplex) supports the following:

```js
const node = await createLibp2pNode({
  muxers: [
    new Mplex({
      /**
       * The total number of inbound protocol streams that can be opened on a given connection
       */
      maxInboundStreams: 1024,

      /**
       * The total number of outbound protocol streams that can be opened on a given connection
       */
      maxOutboundStreams: 1024,

      /**
       * How much incoming data to buffer before resetting the stream
       */
      maxStreamBufferSize: 4 * 1024 * 1024,

      /**
       * Mplex does not support backpressure so to protect ourselves, if `maxInboundStreams` is
       * hit and the remote opens more than this many streams per second, close the connection
       */
      disconnectThreshold: 5
    })
  ]
})
```

### Yamux

[@chainsafe/libp2p-yamux](https://github.com/Chainsafe/js-libp2p-yamux) supports the following:

```js
const node = await createLibp2pNode({
  muxers: [
    new Yamux({
      /**
       * The total number of inbound protocol streams that can be opened on a given connection
       */
      maxInboundStreams: 1024,

      /**
       * The total number of outbound protocol streams that can be opened on a given connection
       */
      maxOutboundStreams: 1024
    })
  ]
})
```

### Protocol limits

When registering listeners for custom protocols, the maximum number of simultaneously open inbound and outbound streams per-connection can be specified. If not specified these will default to 32 inbound streams and 64 outbound streams.

If more than this number of streams for the given protocol are opened on a single connection, subsequent new streams for that protocol will be immediately reset.

Since incoming stream data is buffered until it is comsumed, you should attempt to specify the minimum amount of streams required to keep memory usage to a minimum.

```js
libp2p.handle('/my-protocol/1.0.0', (streamData) => {
  // ..handle stream
}, {
  maxInboundStreams: 10, // defaults to 32
  maxOutboundStreams: 10, // defaults to 64
})
```

## Closing connections

When choosing connections to close the connection manager sorts the list of connections by the value derived from the tags given to each peer. The values of all tags are summed and connections with lower valued peers are elibible for closing first.

```js
// tag a peer
await libp2p.peerStore.tagPeer(peerId, 'my-tag', {
  value: 50, // 0-100 is the typical value range
  ttl: 1000 // optional field, this tag will be deleted after this many ms
})
```

## Transport specific limits

Some transports allow configuring additional limits, please see their READMEs for full config options.

A non-exhaustive list follows:

### TCP

The [@libp2p/tcp](https://github.com/libp2p/js-libp2p-tcp) transport allows additional limits to be configured

```js
const node = await createLibp2pNode({
  transports: [
    new TCP({
      /**
       * Inbound connections with no activity in this timeframe (ms) will be closed
       */
      inboundSocketInactivityTimeout: 30000,

      /**
       * Outbound connections with no activity in this timeframe (ms) will be closed
       */
      outboundSocketInactivityTimeout: 60000,

      /**
       * Once this many connections are open on this listener any further connections
       * will be rejected - this will have no effect if it is larger than the value
       * configured for the ConnectionManager maxConnections parameter
       */
      maxConnections: 200
    })
  ]
})
```

## Allow/deny lists

It is possible to configure some hosts to always accept connections from and some to always reject connections from.

```js
const node = await createLibp2pNode({
  connectionManager: {
    /**
     * A list of multiaddrs, any connection with a `remoteAddress` property
     * that has any of these addresses as a prefix will be accepted ignoring
     * all connection limits
     */
    allow: [
      '/ip4/43.123.5.23/tcp/3984',
      '/ip4/234.243.64.2',
      '/ip4/52.55',
      // etc
    ],

    /**
     * Any connection with a `remoteAddress` property that has any of these
     * addresses as a prefix will be immediately rejected
     */
     deny: [
      '/ip4/132.14.52.64/tcp/3984',
      '/ip4/234.243.64.2',
      '/ip4/34.42',
      // etc
    ]
  }
})
```
