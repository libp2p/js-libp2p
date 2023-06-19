import tests from '../../src/connection-encryption/index.js'
import { mockConnectionEncrypter } from '../../src/mocks/connection-encrypter.js'

describe('mock connection encrypter compliance tests', () => {
  tests({
    async setup () {
      return mockConnectionEncrypter()
    },
    async teardown () {

    }
  })
})
