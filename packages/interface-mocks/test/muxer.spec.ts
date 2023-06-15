import tests from '@libp2p/interface-stream-muxer-compliance-tests'
import { mockMuxer } from '../src/muxer.js'

describe('mock stream muxer compliance tests', () => {
  tests({
    async setup () {
      return mockMuxer()
    },
    async teardown () {

    }
  })
})
