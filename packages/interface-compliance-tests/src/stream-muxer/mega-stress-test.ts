import spawn from './spawner.js'
import type { TestSetup } from '../index.js'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface'

export default (common: TestSetup<StreamMuxerFactory>): void => {
  const createMuxer = async (init?: StreamMuxerInit): Promise<StreamMuxer> => {
    const factory = await common.setup()
    return factory.createStreamMuxer(init)
  }

  describe.skip('mega stress test', function () {
    it('10,000 streams with 10,000 msg', async () => { await spawn(createMuxer, 10000, 10000, 5000) })
  })
}
