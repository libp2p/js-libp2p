# Bandwidth Metrics

- Metrics gathering is optional, as there is a performance hit to using it.
- Metrics do NOT currently contain OS level stats, only libp2p application level Metrics. For example, TCP messages (ACK, FIN, etc) are not accounted for.
- See the [API](./API.md) for Metrics usage. Metrics in libp2p do not emit events, as such applications wishing to read Metrics will need to do so actively. This ensures that the system is not unnecessarily firing update notifications.

## Tracking
- When a transport hands off a connection for upgrading, Metrics are hooked up if enabled.
- When a stream is created, Metrics will be tracked on that stream and associated to that streams protocol.
- Tracked Metrics are associated to a specific peer, and count towards global bandwidth Metrics.

### Metrics Processing
- The main Metrics object consists of individual `Stats` objects
- The following categories are tracked:
  - Global stats; every byte in and out
  - Peer stats; every byte in and out, per peer
  - Protocol stats; every byte in and out, per protocol
- When a message goes through Metrics:
  - It is added to the global stat
  - It is added to the stats for the remote peer
  - It is added to the protocol stats if there is one
- When data is pushed onto a `Stat` it is added to a queue
  - The queue is processed at the earliest of either (configurable):
    - every 2 seconds after the last item was added to the queue
    - or once 1000 items have been queued
  - When the queue is processed:
    - The data length is added to either the `in` or `out` stat
    - The moving averages is calculated since the last queue processing (based on most recently processed item timestamp)
