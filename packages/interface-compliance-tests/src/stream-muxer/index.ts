import baseTest from './base-test.ts'
import closeTest from './close-test.ts'
import steamTest from './stream-test.ts'
import stressTest from './stress-test.ts'
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
