/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import suite from '@libp2p/interface-compliance-tests/connection-encryption'
import { defaultLogger } from '@libp2p/logger'
import { plaintext } from '@libp2p/plaintext'

describe('plaintext connection encrypter interface compliance', () => {
  suite({
    async setup (opts) {
      return plaintext()({
        privateKey: opts?.privateKey ?? await generateKeyPair('Ed25519'),
        logger: defaultLogger()
      })
    },
    async teardown () {

    }
  })
})
