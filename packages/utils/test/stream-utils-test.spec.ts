/* eslint-env mocha */

import { expect } from 'aegir/chai'
import all from 'it-all'
import drain from 'it-drain'
import { pEvent } from 'p-event'
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

    Promise.resolve().then(async () => {
      for (const buf of input) {
        if (!outgoing.send(buf)) {
          await pEvent(outgoing, 'drain')
        }
      }

      await outgoing.closeWrite()
    })

    await expect(all(it.source)).to.eventually.deep.equal(input)
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

    expect(output).to.deep.equal(input)
  })

  it('should throw from source if stream is reset', async () => {
    const [outgoing] = await streamPair()

    const err = new Error('Urk!')
    const it = messageStreamToDuplex(outgoing)

    outgoing.abort(err)

    await expect(drain(it.source)).to.eventually.be.rejected()
      .with.property('message', err.message)
  })

  it('should throw from sink if stream is reset', async () => {
    const [outgoing] = await streamPair()

    const err = new Error('Urk!')
    const it = messageStreamToDuplex(outgoing)

    outgoing.abort(err)

    await expect(it.sink([
      Uint8Array.from([0, 1, 2, 3])
    ])).to.eventually.be.rejected()
      .with.property('message', err.message)
  })
})

describe('echo', () => {
  it('should echo message streams', async () => {
    const [outgoing, incoming] = await streamPair()

    void echo(incoming)

    const input = new Array(10).fill(0).map((val, index) => {
      return Uint8Array.from([0, 1, 2, 3, index])
    })

    const [, output] = await Promise.all([
      Promise.resolve().then(async () => {
        for (const buf of input) {
          if (!outgoing.send(buf)) {
            await pEvent(outgoing, 'drain')
          }
        }

        await outgoing.closeWrite()
      }),
      all(outgoing)
    ])

    expect(output).to.deep.equal(input)
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

    const vals = await pipe(
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

    expect(vals).to.deep.equal([
      Uint8Array.from([1, 2, 3, 4]),
      Uint8Array.from([5, 6, 7, 8]),
      Uint8Array.from([9, 10, 1, 2])
    ])
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
