/* eslint-env mocha */

import suite from '@libp2p/interface-connection-encrypter-compliance-tests'
import { plaintext } from '../../src/insecure/index.js'

describe('plaintext compliance', () => {
  suite({
    async setup () {
      return plaintext()()
    },
    async teardown () {

    }
  })
})
