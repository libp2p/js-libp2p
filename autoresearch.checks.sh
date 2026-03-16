#!/bin/bash
set -euo pipefail

cd /Users/aristotle/Documents/Projects/js-libp2p/packages/transport-webrtc
../../node_modules/.bin/aegir test -t node --cov -- --exit >/tmp/autoresearch-webrtc-test.log 2>&1 || {
  tail -n 80 /tmp/autoresearch-webrtc-test.log
  exit 1
}
