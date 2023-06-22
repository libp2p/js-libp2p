/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/stream-muxer'
import { mplex } from '../src/index.js'

describe('compliance', () => {
  tests({
    async setup () {
      return mplex({
        maxInboundStreams: Infinity,
        disconnectThreshold: Infinity
      })()
    },
    async teardown () {}
  })
})
