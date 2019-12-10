# Bandwidth Metrics

* Metrics gathering should be optional, as there is a performance hit to using it.
* Metrics do NOT currently contain OS level stats, only libp2p application level metrics. For example, TCP messages (ACK, FIN, etc) are not accounted for.

## Tracking
* When a transport hands off a connection for upgrading, metrics are hooked up if turned on.
* When a stream is created, metrics will be tracked on that stream and associated to that streams protocol.

### Outbound / Inbound
1. MultiaddrConnection is created by the transport and the Upgrader is called.
1. The Upgrader passes MultiaddrConnection to Metrics collection.
1. ... metrics sets up temporary tracking
1. Crypto is negotiated. The crypto protocol and remotePeer are known.
1. The crypto protocol and remotepeer are passed to Metric collection.
1. ... metrics moves temporary tracking to per peer tracking
1. Multiplexer selection occurs. This data can be globally tracked.
1. Upgrader passes off new streams to Metrics for per protocol monitoring

### Questions?
* Should we track crypto protocol bandwidth for crypto handshaking? We won't know the remote peer id for sure until crypto is done, so we will need some way to lazily track by id.
* Should we track muxer protocol bandwidth for muxer selection? This is likely not worth it.
* If metrics is disabled, how will Connection Manager cull connections?
  * Topology peers first? What happens when a Topology has too many peers, which ones are pruned first?

## Notes
* Tracking stats on a connection would result in stat loss when the connection is destroyed.
* Global stats tracking doesn't account for any per peer cleanup. (If we haven't talked with a peer in days or weeks, should we keep that info? There are memory implications in doing so.)
  * The current implementation uses an LRU cache of 50 old peers. So we will only retain the 50 most recently disconnected peers.
* Total bandwidth - cumulative protocol bandwidth = crypto negotiation + cumulative multiselect negotiation
* Stats to this point has been a push based system, it should be moved to poll. This would help avoid unnecessary events and allow users to better customize their metrics collection.
* RemotePeer can't be reliably determined until crypto has been completed.
* Metrics tracking per connection would provide better visibility into multiple connections to a single peer. Is this needed? Ideally we should be converging to a single connection. Converge on lowest hash?



```js
Stats {
  // Global bandwidth tracking per peer.
  // Crypto must be done before PeerId can be determined.
  onData ({ PeerId, DataLength })

  // Called whenever data goes through a stream.
  // Should not be added to global tracking.
  onData ({ PeerId, Protocol, DataLength })
}
```


## Current Stats
- The main Metrics object consists of individual Stat objects
- The following categories are tracked:
  - Global stats; every byte in and out
  - Peer stats; every byte in and out, per peer
  - Protocol stats; every byte in and out, per protocol
  - Transport stats; every byte in and out, per transport
- When a message goes through metrics, an `update` event will be triggered for each of the following if applicable:
  - It is added to the global stat
  - It is added to the stats for the remote peer
  - It is added to the protocol stats if there is one
  - It is added to the transport stats if there is one
- When data is pushed onto a `Stat` it is added to a queue
  - The queue is processed at the earliest of either (configurable):
    - every 2 seconds after the last item was added to the queue
    - or once 1000 items have been queued
  - When the queue is processed:
    - The data length is added to either the `in` or `out` stat
    - The moving averages is calculated since the last queue processing (based on most recently processed item timestamp)

### Issues
- Events are being triggered too frequently
