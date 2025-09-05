import baseTest from './base-test.js'
import closeTest from './close-test.js'
import steamTest from './stream-test.js'
import stressTest from './stress-test.js'
import type { TestSetup } from '../index.js'
import type { StreamMuxerFactory } from '@libp2p/interface'

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('interface-stream-muxer', () => {
    baseTest(common)
    closeTest(common)
    steamTest(common)
    stressTest(common)
  })
}
