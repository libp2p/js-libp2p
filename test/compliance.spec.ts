/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/peer-discovery'
import { Bootstrap } from '../src/index.js'
import peerList from './fixtures/default-peers.js'

describe('compliance tests', () => {
  tests({
    async setup () {
      const bootstrap = new Bootstrap({
        list: peerList,
        interval: 2000
      })

      return bootstrap
    },
    async teardown () {}
  })
})
