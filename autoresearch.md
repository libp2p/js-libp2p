# Autoresearch: improve WebRTC streaming throughput toward TCP

## Objective
Increase js-libp2p WebRTC stream throughput in Node.js without cheating the benchmark and without overfitting to a single number. The target workload is the perf-protocol streaming benchmark described in `benchmarking-results.md`, with a focus on the large throughput gap that already exists in `webrtc-direct` relative to `tcp`.

The main optimization target is the WebRTC data path used by `@libp2p/webrtc` streams in Node.js. Improvements should be real transport/stream wins that also benefit normal libp2p traffic, not benchmark-specific shortcuts.

## Metrics
- **Primary**: `webrtc_direct_tcp_ratio` (unitless, higher is better)
  - Computed as the geometric mean of:
    - `webrtc-direct.upload.median / tcp.upload.median`
    - `webrtc-direct.download.median / tcp.download.median`
- **Secondary**:
  - `webrtc_direct_upload_mbps`
  - `webrtc_direct_download_mbps`
  - `tcp_upload_mbps`
  - `tcp_download_mbps`
  - `webrtc_direct_latency_ms`

## How to Run
`./autoresearch.sh` — runs a shortened representative benchmark (`tcp` + `webrtc-direct`) and prints `METRIC name=value` lines.

## Files in Scope
- `packages/transport-webrtc/src/stream.ts` — per-stream send/receive path, framing, backpressure, drain behavior
- `packages/transport-webrtc/src/constants.ts` — transport limits and framing overhead assumptions
- `packages/transport-webrtc/src/muxer.ts` — data channel creation and stream wiring
- `packages/transport-webrtc/src/private-to-public/utils/get-rtcpeerconnection.ts` — node-datachannel peer connection configuration for WebRTC Direct
- `packages/transport-webrtc/src/private-to-private/*` — WebRTC transport plumbing if needed for stream/datachannel behavior
- `packages/protocol-perf/src/*` — only if needed to build a more representative diagnostic benchmark, not to special-case perf traffic
- `benchmark/webrtc-perf.mjs` — benchmark harness only for measurement/diagnostics, not for changing semantics to improve reported numbers
- `autoresearch.sh`, `autoresearch.checks.sh`, `autoresearch.md`, `autoresearch.ideas.md`

## Off Limits
- Do not change the benchmark to report better numbers without improving real transport behavior
- Do not special-case the perf protocol or benchmark traffic in production code
- Do not reduce transferred bytes, skip validation, or otherwise game the measurement
- Do not make changes that knowingly break browser / interop expectations without strong evidence and tests

## Constraints
- Keep improvements representative of real libp2p WebRTC streaming workloads
- Prefer fixes in general stream/backpressure/framing behavior over benchmark-only tweaks
- Node.js / `node-datachannel` is the immediate target, but avoid obviously harming browser correctness
- Relevant package tests must pass for kept changes

## What's Been Tried
- Baseline from `benchmarking-results.md`:
  - TCP: ~5.23 Gbit/s upload, ~5.89 Gbit/s download, 21 ms latency
  - WebRTC Direct: ~317 Mbps upload, ~356 Mbps download, 89 ms latency
  - WebRTC: ~230 Mbps upload, ~244 Mbps download, 237.5 ms latency
- Increasing `maxBufferedAmount` alone to 16 MiB had negligible effect
- Increasing `maxMessageSize` above 16 KiB failed in this environment due to libdatachannel message-size limits
- Current hypotheses to test:
  - Backpressure may be too bursty because `bufferedAmountLowThreshold` is set to `0`, so sending resumes only after the channel drains completely
  - The non-Firefox send path may be turning one logical framed message into multiple RTC data channel messages by iterating `Uint8ArrayList` chunks, increasing message overhead significantly
  - Per-message protobuf + length-prefix framing/copy behavior may add avoidable overhead in the hot path
