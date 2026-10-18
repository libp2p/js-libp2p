import tests from '@libp2p/interface-compliance-tests/stream-muxer'
import { mplex } from '../src/index.ts'

describe('compliance', () => {
  tests({
    async setup () {
      return mplex({
        disconnectThreshold: Infinity
      })()
    },
    async teardown () {}
  })
})
