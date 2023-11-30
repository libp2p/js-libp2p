import { expect } from 'aegir/chai'
import all from 'it-all'
import drain from 'it-drain'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import pLimit from 'p-limit'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { StreamMuxer, StreamMuxerInit } from '@libp2p/interface'

export default async (createMuxer: (init?: StreamMuxerInit) => Promise<StreamMuxer>, nStreams: number, nMsg: number, limit?: number): Promise<void> => {
  const [dialerSocket, listenerSocket] = duplexPair<Uint8Array | Uint8ArrayList>()

  const msg = new Uint8ArrayList(uint8ArrayFromString('simple msg'))

  const listener = await createMuxer({
    direction: 'inbound',
    onIncomingStream: (stream) => {
      void pipe(
        stream,
        drain
      ).then(async () => {
        await stream.close()
      })
        .catch(err => { stream.abort(err) })
    }
  })
  const dialer = await createMuxer({ direction: 'outbound' })

  void pipe(listenerSocket, listener, listenerSocket)
  void pipe(dialerSocket, dialer, dialerSocket)

  const spawnStream = async (): Promise<void> => {
    const stream = await dialer.newStream()
    expect(stream).to.exist // eslint-disable-line

    const res = await pipe(
      (async function * () {
        for (let i = 0; i < nMsg; i++) {
          yield msg
        }
      }()),
      stream,
      async (source) => all(source)
    )

    expect(res).to.be.eql([])
  }

  const limiter = pLimit(limit ?? Infinity)

  await Promise.all(
    Array.from(Array(nStreams), async () => { await limiter(async () => { await spawnStream() }) })
  )
}
