#!/bin/bash
set -euo pipefail

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

node benchmark/webrtc-perf.mjs \
  --throughput-iterations=1 \
  --throughput-seconds=3 \
  --latency-iterations=3 \
  > "$tmp"

node --input-type=module - "$tmp" <<'EOF'
import fs from 'node:fs'

const path = process.argv[2]
const data = JSON.parse(fs.readFileSync(path, 'utf8'))

const mbps = (transport, direction) => data.results[transport][direction].median / 1e6
const latencyMs = (transport) => data.results[transport].latency.median * 1000

const tcpUpload = mbps('tcp', 'upload')
const tcpDownload = mbps('tcp', 'download')
const webrtcDirectUpload = mbps('webrtc-direct', 'upload')
const webrtcDirectDownload = mbps('webrtc-direct', 'download')
const webrtcUpload = mbps('webrtc', 'upload')
const webrtcDownload = mbps('webrtc', 'download')

const throughputRatioPct = (
  (webrtcDirectUpload / tcpUpload) +
  (webrtcDirectDownload / tcpDownload) +
  (webrtcUpload / tcpUpload) +
  (webrtcDownload / tcpDownload)
) / 4 * 100

const metrics = {
  throughput_ratio_pct: throughputRatioPct,
  tcp_upload_mbps: tcpUpload,
  tcp_download_mbps: tcpDownload,
  tcp_latency_ms: latencyMs('tcp'),
  webrtc_direct_upload_mbps: webrtcDirectUpload,
  webrtc_direct_download_mbps: webrtcDirectDownload,
  webrtc_direct_latency_ms: latencyMs('webrtc-direct'),
  webrtc_upload_mbps: webrtcUpload,
  webrtc_download_mbps: webrtcDownload,
  webrtc_latency_ms: latencyMs('webrtc')
}

for (const [name, value] of Object.entries(metrics)) {
  console.log(`METRIC ${name}=${value}`)
}
EOF
