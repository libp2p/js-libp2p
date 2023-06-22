/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/peer-discovery'
import { stubInterface } from 'sinon-ts'
import { bootstrap } from '../src/index.js'
import peerList from './fixtures/default-peers.js'
import type { PeerStore } from '@libp2p/interface/peer-store'

describe('compliance tests', () => {
  tests({
    async setup () {
      const components = {
        peerStore: stubInterface<PeerStore>()
      }

      return bootstrap({
        list: peerList,
        timeout: 100
      })(components)
    },
    async teardown () {}
  })
})
