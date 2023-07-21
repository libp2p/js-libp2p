import { itBench } from '@dapplion/benchmark'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import { testClientServer as testMplexClientServer } from '../mplex.util.js'
import { testClientServer as testYamuxClientServer } from '../util.js'

describe('comparison benchmark', () => {
  for (const { impl, name } of [
    { impl: testYamuxClientServer, name: 'yamux' },
    { impl: testMplexClientServer, name: 'mplex' }
  ]) {
    for (const { numMessages, msgSize } of [
      { numMessages: 1, msgSize: 2 ** 6 },
      { numMessages: 1, msgSize: 2 ** 10 },
      { numMessages: 1, msgSize: 2 ** 16 },
      { numMessages: 1, msgSize: 2 ** 20 },
      { numMessages: 1000, msgSize: 2 ** 6 },
      { numMessages: 1000, msgSize: 2 ** 10 },
      { numMessages: 1000, msgSize: 2 ** 16 },
      { numMessages: 1000, msgSize: 2 ** 20 }
    ]) {
      itBench<ReturnType<typeof impl>, undefined>({
        id: `${name} send and receive ${numMessages} ${msgSize / 1024}KB chunks`,
        beforeEach: () => impl({
          onIncomingStream: (stream) => {
            void pipe(stream, drain).then(async () => { await stream.close() })
          }
        }),
        fn: async ({ client, server }) => {
          const stream = await client.newStream()
          await pipe(Array.from({ length: numMessages }, () => new Uint8Array(msgSize)), stream, drain)
        }
      })
    }
  }
})
