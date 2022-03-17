/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/stream-muxer'
import { Mplex } from '../src/index.js'

describe('compliance', () => {
  tests({
    async setup () {
      return new Mplex()
    },
    async teardown () {}
  })
})
