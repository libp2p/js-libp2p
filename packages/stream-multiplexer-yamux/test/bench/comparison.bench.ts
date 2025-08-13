import { itBench } from '@dapplion/benchmark'
import { mplex } from '@libp2p/mplex'
import { multiaddrConnectionPair } from '@libp2p/utils'
import { pEvent } from 'p-event'
import { yamux } from '../../src/index.ts'
import type { StreamMuxer } from '@libp2p/interface'

interface Fixture {
  client: StreamMuxer
  server: StreamMuxer
}

describe('comparison benchmark', () => {
  for (const { impl, name } of [
    { impl: yamux()(), name: 'yamux' },
    { impl: mplex()(), name: 'mplex' }
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
      itBench<Fixture, undefined>({
        id: `${name} send and receive ${numMessages} ${msgSize / 1024}KB chunks`,
        beforeEach: () => {
          const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

          return {
            client: impl.createStreamMuxer(outboundConnection),
            server: impl.createStreamMuxer(inboundConnection)
          }
        },
        fn: async ({ client, server }) => {
          const stream = await client.createStream()

          for (let i = 0; i < numMessages; i++) {
            const sendMore = stream.send(new Uint8Array(msgSize))

            if (!sendMore) {
              await pEvent(stream, 'drain')
            }
          }

          await stream.closeWrite()
        }
      })
    }
  }
})
