# Limits <!-- omit in toc -->

In order to prevent excessive resource consumption by a libp2p node it's important to understand limits are applied and how to tune them to the needs of your application.

This is important for [DoS](https://en.wikipedia.org/wiki/Denial-of-service_attack) attack mitgation - there is a more holistic discussion and general advice on that topic at [the main libp2p docs website](https://docs.libp2p.io/reference/dos-mitigation/).

## Table of contents <!-- omit in toc -->

- [Connection limits](#connection-limits)
- [Closing connections](#closing-connections)
- [Inbound connection threshold](#inbound-connection-threshold)
- [Stream limits](#stream-limits)
  - [Mplex](#mplex)
  - [Yamux](#yamux)
  - [Protocol limits](#protocol-limits)
- [Transport specific limits](#transport-specific-limits)
  - [TCP](#tcp)
- [Allow/deny lists](#allowdeny-lists)
- [How much memory will be used for buffering?](#how-much-memory-will-be-used-for-buffering)

## Connection limits

It's possible to limit the total amount of connections a node is able to make (combining incoming and outgoing). When this limit is reached and an attempt to open a new connection is made, existing connections may be closed to make room for the new connection (see [Closing connections][#closing-connections]).

* Note: there currently isn't a way to specify different limits for incoming vs. outgoing. Connection limits are applied across both incoming and outgoing connections combined. There is a backlog item for this [here](https://github.com/libp2p/js-libp2p/issues/1508).

We can also limit the number of connections in a "pending" state. These connections have been opened by a remote peer but peer IDs have yet to be exchanged and/or connection encryption and multiplexing negotiated. Once this limit is hit further connections will be closed unless the remote peer has an address in the [allow list](#allowdeny-lists).

All fields are optional. The default values are defined in [src/connection-manager/index.ts](https://github.com/libp2p/js-libp2p/blob/master/src/connection-manager/index.ts) - please see that file for the current values.

```ts
const node = await createLibp2p({
  connectionManager: {
    /**
     * The total number of connections allowed to be open at one time
     */
    maxConnections: number

    /**
     * If the number of open connections goes below this number, the node
     * will try to connect to randomly selected peers from the peer store
     */
    minConnections: number

    /**
     * How many connections can be open but not yet upgraded
     */
    maxIncomingPendingConnections: number
  }
})
```

## Closing connections

When choosing connections to close the connection manager sorts the list of connections by the value derived from the tags given to each peer. The values of all tags are summed and connections with lower valued peers are eligible for closing first. If there are tags with equal values, the shortest-lived connection will be closed first.

```js
// tag a peer
await libp2p.peerStore.tagPeer(peerId, 'my-tag', {
  value: 50, // 0-100 is the typical value range
  ttl: 1000 // optional field, this tag will be deleted after this many ms
})
```

## Inbound connection threshold

To prevent individual peers from opening multiple connections to a node, an `inboundConnectionThreshold` is configurable. This is the number of connections per second an individual peer can open to a node, once this threshold is crossed all further connections opened by that peer will be rejected until the threshold resets in the next second.

All fields are optional. The default values are defined in [src/connection-manager/index.ts](https://github.com/libp2p/js-libp2p/blob/master/src/connection-manager/index.ts) - please see that file for the current values.

```ts
const node = await createLibp2p({
  connectionManager: {
    /**
     * A remote peer may attempt to open up to this many connections per second,
     * any more than that will be automatically rejected
     */
    inboundConnectionThreshold: number
  }
})
```

## Stream limits

libp2p stream multiplexers impose limits on the amount of streams that can be opened per connection, and also the amount of data that will be buffered for a given stream. The data should be consumed as fast as possible - if a stream's input buffer exceeds the limits set the stream will be reset.

These settings are done on a per-muxer basis, please see the README of the relevant muxer you are using.

### Mplex

[@libp2p/mplex](https://github.com/libp2p/js-libp2p-mplex) supports the following.

All fields are optional. The default values are defined in [@libp2p/mplex/src/mplex.ts](https://github.com/libp2p/js-libp2p-mplex/blob/master/src/mplex.ts) - please see that file for the current values.

```ts
const node = await createLibp2p({
  muxers: [
    mplex({
      /**
       * The total number of inbound protocol streams that can be opened on a given connection
       */
      maxInboundStreams: number

      /**
       * The total number of outbound protocol streams that can be opened on a given connection
       */
      maxOutboundStreams: number

      /**
       * How much incoming data in bytes to buffer while attempting to parse messages - peers sending many small messages in batches may cause this buffer to grow
       */
      maxUnprocessedMessageQueueSize: number

      /**
       * How much message data in bytes to buffer after parsing - slow stream consumers may cause this buffer to grow
       */
      maxStreamBufferSize: number

      /**
       * Mplex does not support backpressure so to protect ourselves, if `maxInboundStreams` is
       * hit and the remote opens more than this many streams per second, close the connection
       */
      disconnectThreshold: number
    })
  ]
})
```

### Yamux

[@chainsafe/libp2p-yamux](https://github.com/Chainsafe/js-libp2p-yamux) supports the following.

All fields are optional. The default values are defined in [@chainsafe/libp2p-yamux/src/config.ts](https://github.com/ChainSafe/js-libp2p-yamux/blob/master/src/config.ts) - please see that file for the current values.

```ts
const node = await createLibp2p({
  muxers: [
    yamux({
      /**
       * The total number of inbound protocol streams that can be opened on a given connection
       *
       * This field is optional, the default value is shown
       */
      maxInboundStreams: number

      /**
       * The total number of outbound protocol streams that can be opened on a given connection
       *
       * This field is optional, the default value is shown
       */
      maxOutboundStreams: number
    })
  ]
})
```

### Protocol limits

When registering listeners for custom protocols, the maximum number of simultaneously open inbound and outbound streams per-connection can be specified. If not specified these will default to [32 inbound streams and 64 outbound streams](https://github.com/libp2p/js-libp2p/blob/master/src/registrar.ts#L14-L15).

If more than this number of streams for the given protocol are opened on a single connection, subsequent new streams for that protocol will be immediately reset.

Since incoming stream data is buffered until it is consumed, you should attempt to specify the minimum amount of streams required to keep memory usage to a minimum.

All fields are optional. The default values are defined in [src/registrar.ts](https://github.com/libp2p/js-libp2p/blob/master/src/registrar.ts) - please see that file for the current values.

```ts
libp2p.handle('/my-protocol/1.0.0', (streamData) => {
  // ..handle stream
}, {
  maxInboundStreams: number
  maxOutboundStreams: number
})
```

## Transport specific limits

Some transports allow configuring additional limits, please see their READMEs for full config options.

A non-exhaustive list follows:

### TCP

The [@libp2p/tcp](https://github.com/libp2p/js-libp2p-tcp) transport allows additional limits to be configured.

All fields are optional. The full list of options is defined in [@libp2p/tcp/src/index.ts](https://github.com/libp2p/js-libp2p-tcp/blob/master/src/index.ts) - please see that file for more details.

```ts
const node = await createLibp2p({
  transports: [
    tcp({
      /**
       * Inbound connections with no activity in this time frame (ms) will be closed
       */
      inboundSocketInactivityTimeout: number

      /**
       * Outbound connections with no activity in this time frame (ms) will be closed
       */
      outboundSocketInactivityTimeout: number

      /**
       * Once this many connections are open on this listener any further connections
       * will be rejected - this will have no effect if it is larger than the value
       * configured for the ConnectionManager maxConnections parameter
       */
      maxConnections: number
    })
  ]
})
```

## Allow/deny lists

It is possible to configure some hosts to always accept connections from and some to always reject connections from.

```js
const node = await createLibp2p({
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

## How much memory will be used for buffering?

There is no a single config value to control the amount of memory js-libp2p uses.

Important details for ascertaining this are:

* Each connection has a multiplexer
* Each multiplexer has a buffer for raw incoming data (`muxer.maxUnprocessedMessageQueueSize`)
* The incoming data is parsed into messages for each stream and queued (`muxer.maxStreamBufferSize`)
* Each multiplexer has a stream limit for number of streams (`muxer.maxInboundStreams`, `muxer.maxOutboundStreams`).

As a result, the max amount of memory buffered by libp2p is approximately:

```
connectionManager.maxConnections *
  (muxer.maxUnprocessedMessageQueueSize
   + (muxer.maxInboundStreams * muxer.maxStreamBufferSize)
   + (muxer.maxOutboundStreams * muxer.maxStreamBufferSize)
  )
```
