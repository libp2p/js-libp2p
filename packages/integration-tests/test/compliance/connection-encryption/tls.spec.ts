/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import suite from '@libp2p/interface-compliance-tests/connection-encryption'
import { defaultLogger } from '@libp2p/logger'
import { tls } from '@libp2p/tls'
import { isBrowser, isWebWorker } from 'wherearewe'

describe('tls connection encrypter interface compliance', () => {
  if (isBrowser || isWebWorker) {
    return
  }

  suite({
    async setup (opts) {
      return tls()({
        privateKey: opts?.privateKey ?? await generateKeyPair('Ed25519'),
        logger: defaultLogger()
      })
    },
    async teardown () {

    }
  })
})
