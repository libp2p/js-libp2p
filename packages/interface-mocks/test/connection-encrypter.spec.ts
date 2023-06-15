import tests from '@libp2p/interface-connection-encrypter-compliance-tests'
import { mockConnectionEncrypter } from '../src/connection-encrypter.js'

describe('mock connection encrypter compliance tests', () => {
  tests({
    async setup () {
      return mockConnectionEncrypter()
    },
    async teardown () {

    }
  })
})
