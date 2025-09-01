import { multiaddrConnectionPair, echo } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { TestSetup } from '../index.js'
import type { StreamMuxerFactory, StreamMuxer, MultiaddrConnection } from '@libp2p/interface'

async function * messages (nMsg: number): AsyncGenerator<Uint8Array> {
  for (let i = 0; i < nMsg; i++) {
    yield uint8ArrayFromString(`message ${i + 1}/${nMsg}`)
  }
}

async function spawn (createMuxer: (maConn: MultiaddrConnection) => Promise<StreamMuxer>, nStreams: number, nMsg: number): Promise<void> {
  const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

  const listener = await createMuxer(inboundConnection)
  listener.addEventListener('stream', function echoStreamHandler (evt) {
    echo(evt.detail)
      .catch(err => {
        evt.detail.abort(err)
      })
  })

  const dialer = await createMuxer(outboundConnection)

  const spawnStream = async (): Promise<void> => {
    let receivedBytes = 0
    let sentBytes = 0

    for await (const buf of messages(nMsg)) {
      sentBytes += buf.byteLength
    }

    const receivedAllMessagesPromise = Promise.withResolvers<void>()
    const outboundStream = await dialer.createStream()

    outboundStream.addEventListener('message', function countMessages (evt) {
      receivedBytes += evt.data.byteLength

      outboundStream.log('%s - echoed bytes %d/%d', uint8ArrayToString(evt.data.subarray()), receivedBytes, sentBytes)

      if (receivedBytes === sentBytes) {
        outboundStream.log('received all bytes')
        receivedAllMessagesPromise.resolve()
      }
    })

    for await (const buf of messages(nMsg)) {
      const sendMore = outboundStream.send(buf)

      if (sendMore === false) {
        await pEvent(outboundStream, 'drain', {
          rejectionEvents: ['close']
        })
      }
    }

    await receivedAllMessagesPromise.promise
    outboundStream.log('sent and received all messages %d/%d', receivedBytes, sentBytes)

    await Promise.all([
      pEvent(outboundStream, 'close'),
      outboundStream.close()
    ])

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
  const messages = [1, 10, 100]

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
