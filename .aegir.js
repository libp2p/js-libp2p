import { multiaddr } from '@multiformats/multiaddr'
import { mockRegistrar, mockUpgrader } from '@libp2p/interface-mocks'
import { pipe } from 'it-pipe'

/** @type {import('aegir/types').PartialOptions} */
export default {
  test: {
  },
  build: {
    bundlesizeMax: '18kB'
  }
}
