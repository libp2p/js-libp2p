/* eslint-env mocha */

import { StreamCloseEvent } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import { pEvent } from 'p-event'
import Sinon from 'sinon'
import { Uint8ArrayList } from 'uint8arraylist'
import { streamPair } from '../src/stream-pair.ts'
import { echo, pipe, messageStreamToDuplex, byteStream } from '../src/stream-utils.js'

describe('messageStreamToDuplex', () => {
  it('should source all reads', async () => {
    const [outgoing, incoming] = await streamPair()

    const input = new Array(10).fill(0).map((val, index) => {
      return Uint8Array.from([0, 1, 2, 3, index])
    })

    const it = messageStreamToDuplex(incoming)

    const [
      output
    ] = await Promise.all([
      all(it.source),
      (async () => {
        for (const buf of input) {
          if (!outgoing.send(buf)) {
            await pEvent(outgoing, 'drain')
          }
        }

        await outgoing.close()
      })()
    ])

    expect(new Uint8ArrayList(...output).subarray()).to.equalBytes(new Uint8ArrayList(...input).subarray())
  })

  it('should sink all writes', async () => {
    const [outgoing, incoming] = await streamPair()

    const input = new Array(10).fill(0).map((val, index) => {
      return Uint8Array.from([0, 1, 2, 3, index])
    })

    const it = messageStreamToDuplex(outgoing)

    const output: Array<Uint8Array | Uint8ArrayList> = []

    incoming.addEventListener('message', (evt) => {
      output.push(evt.data)
    })

    it.sink(async function * () {
      yield * input
    }())

    await pEvent(incoming, 'remoteCloseWrite')

    expect(new Uint8ArrayList(...output).subarray()).to.equalBytes(new Uint8ArrayList(...input).subarray())
  })

  it('should throw from sink and source if stream is reset', async () => {
    const [outgoing] = await streamPair()

    const err = new Error('Urk!')
    const it = messageStreamToDuplex(outgoing)

    async function * source (): AsyncGenerator<Uint8Array> {
      yield Uint8Array.from([0, 1, 2, 3])
    }

    const [sinkError, sourceError] = await Promise.all([
      it.sink(source()).catch(err => err),
      drain(it.source).catch(err => err),
      // eslint-disable-next-line @typescript-eslint/await-thenable
      outgoing.abort(err)
    ])

    expect(sinkError).to.equal(err, 'did not throw from sink')
    expect(sourceError).to.equal(err, 'did not throw from source')
  })
})

describe('echo', () => {
  it('should echo message streams', async () => {
    const [outgoing, incoming] = await streamPair()

    void echo(incoming)

    const input = new Array(10).fill(0).map((val, index) => {
      return Uint8Array.from([0, 1, 2, 3, index])
    })

    const [output] = await Promise.all([
      all(outgoing),
      Promise.resolve().then(async () => {
        for (const buf of input) {
          if (!outgoing.send(buf)) {
            await pEvent(outgoing, 'drain')
          }
        }

        await outgoing.close()
      })
    ])

    expect(new Uint8ArrayList(...output).subarray()).to.equalBytes(new Uint8ArrayList(...input).subarray())
  })
})

describe('pipe', () => {
  it('should pipe from one channel to another', async () => {
    const [outgoing, incoming] = await streamPair()

    void echo(incoming)

    const input = [
      Uint8Array.from([0, 1, 2, 3]),
      Uint8Array.from([4, 5, 6, 7]),
      Uint8Array.from([8, 9, 0, 1])
    ]

    const output = await pipe(
      input,
      function * (source) {
        for (const buf of source) {
          yield Uint8Array.from(
            [...buf].map((val) => val + 1)
          )
        }
      },
      outgoing,
      (source) => all(source)
    )

    expect(new Uint8ArrayList(...output).subarray()).to.equalBytes(new Uint8ArrayList(
      Uint8Array.from([1, 2, 3, 4]),
      Uint8Array.from([5, 6, 7, 8]),
      Uint8Array.from([9, 10, 1, 2])
    ).subarray())
  })
})

describe('byte-stream', () => {
  it('should read bytes', async () => {
    const [outgoing, incoming] = await streamPair()

    const outgoingBytes = byteStream(outgoing)
    const incomingBytes = byteStream(incoming)

    const written = new Uint8ArrayList(Uint8Array.from([0, 1, 2, 3]))

    const [read] = await Promise.all([
      incomingBytes.read(),
      outgoingBytes.write(written)
    ])

    expect(read).to.deep.equal(written)
  })

  it('should read and write bytes', async () => {
    const [outgoing, incoming] = await streamPair()

    const outgoingBytes = byteStream(outgoing)
    const incomingBytes = byteStream(incoming)

    const writtenOutgoing = new Uint8ArrayList(Uint8Array.from([0, 1, 2, 3]))
    const writtenIncoming = new Uint8ArrayList(Uint8Array.from([4, 5, 6, 7]))

    const [readIncoming, , readOutgoing] = await Promise.all([
      incomingBytes.read(),
      outgoingBytes.write(writtenOutgoing),
      outgoingBytes.read(),
      incomingBytes.write(writtenIncoming)
    ])

    expect(readIncoming).to.deep.equal(writtenOutgoing)
    expect(readOutgoing).to.deep.equal(writtenIncoming)
  })
})

describe('stream-pair', () => {
  it('should be consumable as async iterable', async () => {
    const [outgoing, incoming] = await streamPair()
    const data = Uint8Array.from([0, 1, 2, 3, 4])

    const [received] = await Promise.all([
      all(incoming),
      Promise.resolve().then(async () => {
        outgoing.send(data)
        await outgoing.close()
      })
    ])

    expect(received).to.have.lengthOf(1)
    expect(received[0].subarray()).to.equalBytes(data)
  })

  it('should be consumable as async iterable after closing for reading', async () => {
    const [, incoming] = await streamPair()

    await incoming.closeRead()
    await expect(all(incoming)).to.eventually.be.empty()
  })

  it('should wait for message listeners', async () => {
    const [outgoing, incoming] = await streamPair()

    expect(incoming.listenerCount('message')).to.equal(0, 'had listeners')
    const dispatchSpy = Sinon.spy(incoming.dispatchEvent)
    const safeDispatchSpy = Sinon.spy(incoming.safeDispatchEvent)

    const data = Uint8Array.from([0, 1, 2, 3, 4])

    const [
      bufs
    ] = await Promise.all([
      all(incoming),
      (async () => {
        outgoing.send(data)
        await outgoing.close()
      })()
    ])

    expect(dispatchSpy.called).to.be.false()
    expect(safeDispatchSpy.called).to.be.false()

    expect(bufs).to.have.lengthOf(1)
    expect(bufs[0].subarray()).to.equalBytes(data)
  })

  it('should reset if no listeners are added and the read buffer fills up', async () => {
    const maxReadBufferLength = 1
    const [outgoing, incoming] = await streamPair({
      inbound: {
        maxReadBufferLength
      }
    })

    expect(incoming.listenerCount('message')).to.equal(0, 'had listeners')

    const [outgoingCloseEvent, incomingCloseEvent] = await Promise.all([
      pEvent<'close', StreamCloseEvent>(outgoing, 'close'),
      pEvent<'close', StreamCloseEvent>(incoming, 'close'),
      (async () => {
        outgoing.send(new Uint8Array(maxReadBufferLength + 1))
        await outgoing.close()
        await delay(100)
      })()
    ])

    expect(outgoingCloseEvent.local).to.be.false()
    expect(outgoingCloseEvent.error).to.be.ok()
    expect(incomingCloseEvent.local).to.be.true()
    expect(incomingCloseEvent.error).to.be.ok()
  })
})
