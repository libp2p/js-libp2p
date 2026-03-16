# Autoresearch: improve WebRTC browser throughput toward TCP

## Objective
Increase WebRTC transport throughput on the code paths shared with browsers so that aggregate WebRTC performance moves closer to the TCP baseline without benchmark-specific hacks.

The existing benchmark context in `benchmarking-results.md` shows:
- TCP is much faster than both `webrtc-direct` and relayed `webrtc`
- `webrtc-direct` already carries most of the throughput gap, so relay signaling is not the main bottleneck
- the practical data-channel message ceiling is ~16 KiB in this environment

The current autoresearch loop uses the existing `benchmark/webrtc-perf.mjs` harness with a shorter runtime for iteration speed, but keeps the workload structure the same: TCP baseline plus both WebRTC modes, upload + download, and latency sampling.

## Metrics
- **Primary**: `webrtc_direct_tcp_ratio` (%, higher is better)
  - Average of:
    - `webrtc-direct upload / tcp upload`
    - `webrtc-direct download / tcp download`
- **Secondary**:
  - `combined_webrtc_mbps`
  - `throughput_ratio_pct`
  - `webrtc_direct_upload_mbps`
  - `webrtc_direct_download_mbps`
  - `webrtc_upload_mbps`
  - `webrtc_download_mbps`
  - `tcp_upload_mbps`
  - `tcp_download_mbps`
  - `webrtc_direct_latency_ms`
  - `webrtc_latency_ms`
  - `tcp_latency_ms`

## How to Run
`./autoresearch.sh`

It runs `benchmark/webrtc-perf.mjs`, writes the raw JSON to a temp file, and prints `METRIC name=value` lines.

## Files in Scope
- `packages/transport-webrtc/src/stream.ts` — per-stream send/receive hot path shared by browser-facing WebRTC code
- `packages/transport-webrtc/src/constants.ts` — framing/message-size limits
- `packages/transport-webrtc/src/muxer.ts` — data-channel creation and stream wiring
- `packages/transport-webrtc/src/util.ts` — drain/close behavior helpers
- `packages/transport-webrtc/src/private-to-public/utils/get-rtcpeerconnection.browser.ts` — browser RTCPeerConnection setup
- `packages/transport-webrtc/src/private-to-public/utils/get-rtcpeerconnection.ts` — node-datachannel setup used by the benchmark
- `packages/utils/src/abstract-message-stream.ts` — shared send-queue logic if profiling points to avoidable overhead there
- `packages/transport-webrtc/test/stream.spec.ts` — targeted behavior coverage for frame sizing / send behavior
- `benchmark/webrtc-perf.mjs` — benchmark harness reference; only change if needed for measurement robustness, never to bias results
- `autoresearch.sh` / `autoresearch.md` / `autoresearch.ideas.md` — loop control and notes

## Off Limits
- `benchmarking-results.md`
- unrelated packages / transports
- benchmark cheats such as reducing transferred bytes, changing perf block size, skipping TCP comparison, or special-casing the benchmark protocol

## Constraints
- Do not overfit to the benchmark
- Do not cheat on the benchmark
- Preserve protocol correctness and interoperability semantics
- Prefer changes that should help both browser and node WebRTC data paths, especially the browser-shared stream/framing hot path
- If a change only helps relay setup latency but not the main throughput bottleneck, it is probably not a good use of time

## What's Been Tried
- Session started from `benchmarking-results.md` context.
- Initial hypothesis: the biggest wins are likely in `packages/transport-webrtc/src/stream.ts`, where every libp2p stream chunk is framed for RTCDataChannel send/receive.
- Strong candidate to test early: non-Firefox `_sendMessage` currently iterates `Uint8ArrayList` chunks and may turn one framed logical message into multiple `RTCDataChannel.send(...)` calls, increasing SCTP/datachannel message count.
- `throughput_ratio_pct` as a primary metric was too sensitive to noisy TCP denominator movement in short runs.
- `combined_webrtc_mbps` reduced denominator noise, but it can hide regressions in the direct path by mixing in relayed WebRTC behavior.
- Current decision: use `webrtc_direct_tcp_ratio` as the primary metric because it best isolates the suspected bottleneck while still anchoring against TCP; keep relayed and absolute throughput metrics as secondary guardrails.
- Confirmed win already landed: send each framed WebRTC record with a single `RTCDataChannel.send(...)` call instead of splitting one logical record across multiple sends.
