import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { AbstractMessageStream } from '../src/abstract-message-stream.ts'
import type { MessageStreamInit, SendResult } from '../src/abstract-message-stream.ts'

class TestStream extends AbstractMessageStream {
  public throwOnSend = false
  public readonly delivered: Uint8Array[] = []

  sendData (data: Uint8ArrayList): SendResult {
    if (this.throwOnSend) {
      throw new Error('Cannot write to a stream that is closed')
    }

    this.delivered.push(data.subarray())

    return { sentBytes: data.byteLength, canSendMore: true }
  }

  sendReset (): void {
    this.log.trace('test sendReset')
  }

  sendPause (): void {
    this.log.trace('test sendPause')
  }

  sendResume (): void {
    this.log.trace('test sendResume')
  }

  close (): Promise<void> {
    return Promise.resolve()
  }
}

function makeInit (): MessageStreamInit {
  return {
    log: defaultLogger().forComponent('test:abstract-message-stream'),
    direction: 'outbound'
  }
}

async function flushMicrotasks (ticks = 3): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
  }
}

interface Internals {
  writeBuffer: Uint8ArrayList
}

describe('AbstractMessageStream processSendQueue send failure', () => {
  it('aborts the stream when sendData throws from the drain microtask instead of swallowing the error', async () => {
    const stream = new TestStream(makeInit())

    // a healthy send drains the write buffer
    stream.send(new Uint8Array(16))
    expect(stream.writeBufferLength).to.equal(0)
    expect(stream.delivered).to.have.lengthOf(1)

    // recreate the post-drain state: bytes are queued again and the transport
    // had previously signalled backpressure
    const internals = stream as unknown as Internals
    internals.writeBuffer.append(new Uint8Array(16))
    stream.writableNeedsDrain = true

    // the underlying transport is now closing, so the next sendData throws
    stream.throwOnSend = true

    // the drain event schedules processSendQueue in a microtask. Before this fix
    // the throw was caught and logged by the microtask guard, leaving the stream
    // writable with the chunk silently dropped. Now the chunk is restored and the
    // stream is aborted so the failure is observable.
    stream.dispatchEvent(new Event('drain'))
    await flushMicrotasks()

    expect(stream.status).to.equal('aborted')
    expect(stream.delivered).to.have.lengthOf(1)
  })
})
