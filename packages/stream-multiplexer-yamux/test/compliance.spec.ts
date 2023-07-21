/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/stream-muxer'
import { TestYamux } from './util.js'

describe('compliance', () => {
  tests({
    async setup () {
      return new TestYamux({})
    },
    async teardown () {}
  })
})
