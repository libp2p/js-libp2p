# WebRTC Benchmarking Results

## Context

Issue [#3033](https://github.com/libp2p/js-libp2p/issues/3033) reported that WebRTC streaming performance in Node.js was roughly an order of magnitude slower than TCP.

This repository checkout did not contain a local PR diff to review. The `chore/webrtc-benchmarking` branch pointed at the same commit as `main`, so the work here focused on reproducing the benchmark with current code from this checkout and current upstream `node-datachannel`.

The benchmark harness added in [benchmark/webrtc-perf.mjs](./benchmark/webrtc-perf.mjs) uses `@libp2p/perf`, which is the same perf protocol used by the historical dashboard benchmark.

## Environment

- Repository: `js-libp2p`
- Node.js: `v22.15.0`
- Local transport dependency: `node-datachannel@0.29.0`
- Benchmark target types:
  - `tcp`
  - `webrtc-direct`
  - `webrtc`

## Command

```bash
node benchmark/webrtc-perf.mjs \
  --throughput-iterations=3 \
  --throughput-seconds=10 \
  --latency-iterations=10 \
  > /tmp/js-libp2p-webrtc-benchmark.json
```

## Median Results

| Transport | Upload | Download | Latency |
| --- | ---: | ---: | ---: |
| TCP | 5.23 Gbit/s | 5.89 Gbit/s | 21 ms |
| WebRTC Direct | 317 Mbps | 356 Mbps | 89 ms |
| WebRTC | 230 Mbps | 244 Mbps | 237.5 ms |

## Relative Slowdown vs TCP

- `webrtc-direct` upload: `16.5x` slower
- `webrtc-direct` download: `16.5x` slower
- `webrtc` upload: `22.7x` slower
- `webrtc` download: `24.2x` slower

## Interpretation

The old issue still reproduces with current upstream `node-datachannel`. The transport no longer depends on the old `ipshipyard/js-node-datachannel` fork for this benchmark, but the large gap relative to TCP remains.

The most important result is that `webrtc-direct` is already an order of magnitude slower than TCP. That means the bulk of the throughput regression is not explained by circuit relay signaling or WebRTC reservation setup. `webrtc` is somewhat slower than `webrtc-direct`, especially on connection latency, but the large throughput gap exists before relay-assisted dialing enters the picture.

This points the likely bottleneck at the WebRTC data channel/native path, or at the js-libp2p stream framing layered on top of it, rather than at relay signaling.

## Likely Contributing Factors in Current Code

- [`packages/transport-webrtc/src/constants.ts`](./packages/transport-webrtc/src/constants.ts) caps `MAX_MESSAGE_SIZE` at `16 KiB`
- [`packages/transport-webrtc/src/constants.ts`](./packages/transport-webrtc/src/constants.ts) caps `MAX_BUFFERED_AMOUNT` at `2 MiB`
- [`packages/transport-webrtc/src/stream.ts`](./packages/transport-webrtc/src/stream.ts) applies that message-size cap to each stream and wraps payloads in protobuf + length-prefix framing before sending

The perf service writes in `64 KiB` blocks, so WebRTC streams fragment those writes into multiple smaller channel messages.

## Extra Checks

### Increased `maxBufferedAmount`

A focused rerun of `webrtc-direct` with `--webrtc-max-buffered-amount=16777216` produced only negligible change:

- default upload: `231.96 Mbps`
- tuned upload: `236.02 Mbps`
- default download: `288.14 Mbps`
- tuned download: `280.99 Mbps`

This suggests the buffered-amount threshold is not the main bottleneck.

### Increased `maxMessageSize`

Attempts to increase WebRTC message size above the default failed immediately:

- `32 KiB`: `libdatachannel error while sending data channel message: Message size exceeds limit`
- `64 KiB`: `libdatachannel error while sending data channel message: Message size exceeds limit`

That strongly suggests the practical message-size ceiling is enforced by the underlying data channel stack in this environment, not just by a conservative js-libp2p default.

## Conclusion

The benchmark baseline indicates that the historical WebRTC throughput issue still exists on current upstream dependencies.

The strongest conclusion from this run is:

1. The old fork is not required to reproduce the slowdown.
2. The main bottleneck is not relay signaling.
3. The likely bottleneck is in the WebRTC data path itself, with the small effective message-size ceiling being a concrete suspect.

## Recommended Next Step

Add a raw `node-datachannel` microbenchmark that measures data channel throughput without js-libp2p stream framing. That will separate:

- native WebRTC / SCTP / libdatachannel limits
- js-libp2p framing and stream implementation overhead
