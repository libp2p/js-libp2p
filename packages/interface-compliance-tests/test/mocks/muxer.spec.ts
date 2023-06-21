import { mockMuxer } from '../../src/mocks/muxer.js'
import tests from '../../src/stream-muxer/index.js'

describe('mock stream muxer compliance tests', () => {
  tests({
    async setup () {
      return mockMuxer()
    },
    async teardown () {

    }
  })
})
