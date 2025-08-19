import { multiaddrConnectionPair, echo } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { TestSetup } from '../index.js'
import type { StreamMuxerFactory, StreamMuxer, MultiaddrConnection } from '@libp2p/interface'

async function spawn (createMuxer: (maConn: MultiaddrConnection) => Promise<StreamMuxer>, nStreams: number, nMsg: number): Promise<void> {
  const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

  const listener = await createMuxer(inboundConnection)
  listener.addEventListener('stream', (evt) => {
    echo(evt.detail)
  })

  const dialer = await createMuxer(outboundConnection)

  const spawnStream = async (): Promise<void> => {
    let sentBytes = 0
    let receivedBytes = 0

    const receivedAllMessagesPromise = Promise.withResolvers<void>()
    const outboundStream = await dialer.createStream()

    async function * messages (): AsyncGenerator<Uint8Array> {
      for (let i = 0; i < nMsg; i++) {
        yield uint8ArrayFromString(`message ${i + 1}/${nMsg}`)
      }
    }

    outboundStream.addEventListener('message', (evt) => {
      receivedBytes += evt.data.byteLength

      if (receivedBytes === sentBytes) {
        receivedAllMessagesPromise.resolve()
      }
    })

    for await (const buf of messages()) {
      sentBytes += buf.byteLength
    }

    for await (const buf of messages()) {
      const sendMore = outboundStream.send(buf)

      if (sendMore === false) {
        await pEvent(outboundStream, 'drain', {
          rejectionEvents: ['close']
        })
      }
    }

    await receivedAllMessagesPromise.promise
    outboundStream.log('sent and received all messages %d/%d', receivedBytes, sentBytes)

    await outboundStream.closeWrite()

    expect(receivedBytes).to.equal(sentBytes)
  }

  await Promise.all(
    Array.from(Array(nStreams), async () => {
      await spawnStream()
    })
  )

  await listener.close()
  await dialer.close()
}

export default (common: TestSetup<StreamMuxerFactory>): void => {
  const createMuxer = async (maConn: MultiaddrConnection): Promise<StreamMuxer> => {
    const factory = await common.setup()
    return factory.createStreamMuxer(maConn)
  }

  const streams = [1, 10, 100, 1000]
  const messages = [1, 10, 100, 1000]

  describe('stress test', function () {
    this.timeout(1_600_000)

    for (let i = 0; i < streams.length; i++) {
      for (let j = 0; j < messages.length; j++) {
        it(`${streams[i]} stream(s) with ${messages[j]} msg(s)`, async () => {
          await spawn(createMuxer, streams[i], messages[j])
        })
      }
    }
  })
}
