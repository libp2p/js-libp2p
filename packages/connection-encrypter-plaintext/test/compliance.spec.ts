/* eslint-env mocha */

import suite from '@libp2p/interface-compliance-tests/connection-encryption'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { plaintext } from '../src/index.js'

describe('plaintext compliance', () => {
  suite({
    async setup (opts) {
      return plaintext()({
        peerId: opts?.peerId ?? await createEd25519PeerId(),
        logger: defaultLogger()
      })
    },
    async teardown () {

    }
  })
})
