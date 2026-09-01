/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/stream-muxer'
import { yamux } from '../src/index.ts'

describe('compliance', () => {
  tests({
    async setup () {
      return yamux()()
    },
    async teardown () {}
  })
})
