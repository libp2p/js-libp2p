# Bandwidth Metrics

* Metrics gathering should be optional, as there is a performance hit to using it.
* Metrics do NOT currently contain OS level stats, only libp2p application level metrics. For example, TCP messages (ACK, FIN, etc) are not accounted for.

## Tracking
* When a transport hands off a connection for upgrading, metrics are hooked up if turned on.
* When a stream is created, metrics will be tracked on that stream and associated to that streams protocol.

### Questions?
* Should we track crypto protocol bandwidth for crypto handshaking? We won't know the remote peer id for sure until crypto is done, so we will need some way to lazily track by id.
* Should we track muxer protocol bandwidth for muxer selection? This is likely not worth it.
* If metrics is disabled, how will Connection Manager cull connections?
  * Topology peers first? What happens when a Topology has too many peers, which ones are pruned first?

## Notes
* Tracking stats on a connection would result in stat loss when the connection is destroyed.
* Global stats tracking doesn't account for any per peer cleanup. (If we haven't talked with a peer in days or weeks, should we keep that info? There are memory implications in doing so.)
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