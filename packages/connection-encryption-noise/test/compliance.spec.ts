import tests from '@libp2p/interface-compliance-tests/connection-encryption'
import { Noise } from '../src/noise.js'

describe('spec compliance tests', function () {
  tests({
    async setup () {
      return new Noise()
    },
    async teardown () {}
  })
})
