import tests from '@libp2p/interface-compliance-tests/stream-muxer'
import { mockMuxer } from '@libp2p/test-utils'

describe('mock stream muxer compliance tests', () => {
  tests({
    async setup () {
      return mockMuxer()
    },
    async teardown () {

    }
  })
})
