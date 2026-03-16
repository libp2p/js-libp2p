#!/bin/bash
set -euo pipefail

out=$(mktemp)
trap 'rm -f "$out"' EXIT

(
  cd /Users/aristotle/Documents/Projects/js-libp2p/packages/transport-webrtc
  ../../node_modules/.bin/aegir build >/tmp/autoresearch-webrtc-build.log 2>&1
) || {
  tail -n 80 /tmp/autoresearch-webrtc-build.log
  exit 1
}

node benchmark/webrtc-perf.mjs \
  --transports=tcp \
  --transports=webrtc-direct \
  --throughput-iterations=2 \
  --throughput-seconds=3 \
  --latency-iterations=1 \
  > "$out"

node --input-type=module - "$out" <<'EOF'
import fs from 'node:fs'

const path = process.argv[2]
const summary = JSON.parse(fs.readFileSync(path, 'utf8'))
const tcp = summary.results.tcp
const webrtc = summary.results['webrtc-direct']

if (tcp == null || webrtc == null) {
  throw new Error('Missing tcp or webrtc-direct benchmark results')
}

const uploadRatio = webrtc.upload.median / tcp.upload.median
const downloadRatio = webrtc.download.median / tcp.download.median
const ratio = Math.sqrt(uploadRatio * downloadRatio)

const mbps = (bitsPerSecond) => bitsPerSecond / 1e6
const ms = (seconds) => seconds * 1e3

console.log(`METRIC webrtc_direct_tcp_ratio=${ratio}`)
console.log(`METRIC webrtc_direct_upload_mbps=${mbps(webrtc.upload.median)}`)
console.log(`METRIC webrtc_direct_download_mbps=${mbps(webrtc.download.median)}`)
console.log(`METRIC tcp_upload_mbps=${mbps(tcp.upload.median)}`)
console.log(`METRIC tcp_download_mbps=${mbps(tcp.download.median)}`)
console.log(`METRIC webrtc_direct_latency_ms=${ms(webrtc.latency.median)}`)
EOF
