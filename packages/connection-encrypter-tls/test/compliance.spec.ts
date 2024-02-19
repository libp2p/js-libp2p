/* eslint-env mocha */

import suite from '@libp2p/interface-compliance-tests/connection-encryption'
import { defaultLogger } from '@libp2p/logger'
import { tls } from '../src/index.js'

describe('tls compliance', () => {
  suite({
    async setup () {
      return tls()({
        logger: defaultLogger()
      })
    },
    async teardown () {

    }
  })
})
