/* eslint-env mocha */

import suite from '@libp2p/interface-compliance-tests/connection-encrypter'
import { Plaintext } from '../../src/insecure/index.js'

describe('plaintext compliance', () => {
  suite({
    async setup () {
      return new Plaintext()
    },
    async teardown () {

    }
  })
})
