import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { multiaddrConnectionPair } from '../src/multiaddr-connection-pair.ts'
import { streamPair } from '../src/stream-pair.ts'
import type { AbstractMultiaddrConnection } from '../src/abstract-multiaddr-connection.ts'
import type { AbstractStream } from '../src/abstract-stream.ts'
import type { Uint8ArrayList } from 'uint8arraylist'

async function collect (source: AsyncIterable<Uint8Array | Uint8ArrayList>): Promise<Uint8Array[]> {
  return (await all(source)).map(buf => buf.subarray())
}

describe('message stream async iterator', () => {
  it('should yield buffered data when the remote closes their writable end while paused', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const reading = collect(conn)

    conn.pause()
    conn.onData(uint8ArrayFromString('hello world'))
    conn.onRemoteCloseWrite()
    conn.resume()

    await expect(reading).to.eventually.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should yield buffered data when the transport closes while paused', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const reading = collect(conn)

    conn.pause()
    conn.onData(uint8ArrayFromString('hello world'))
    conn.onTransportClosed()
    conn.resume()

    await expect(reading).to.eventually.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should yield all data when the reader pauses and the remote closes', async () => {
    const [outbound, inbound] = await streamPair()
    const total = 1024 * 1024
    const chunk = 65536

    let received = 0
    let paused = false

    const reading = (async () => {
      for await (const buf of inbound) {
        received += buf.byteLength

        if (!paused) {
          // eg. echo() waiting for 'drain' before reading on
          paused = true
          inbound.pause()
          await delay(50)
          inbound.resume()
        }
      }
    })()

    for (let i = 0; i < total; i += chunk) {
      outbound.send(new Uint8Array(chunk))
    }

    await outbound.close()
    await reading

    expect(received).to.equal(total)
  })

  it('should end when the readable end has already ended', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    conn.onRemoteCloseWrite()

    expect(conn).to.have.property('readableEnded', true)

    await expect(collect(conn)).to.eventually.be.empty()
  })

  it('should end after yielding data pushed back after the readable end ended', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    conn.onRemoteCloseWrite()

    expect(conn).to.have.property('readableEnded', true)

    // eg. a byte stream being unwrapped after the remote finished
    conn.unshift(uint8ArrayFromString('hello world'))

    await expect(collect(conn)).to.eventually.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should yield buffered data then throw when the remote has already reset', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    // no 'message' listener, so the data stays in the read buffer
    conn.push(uint8ArrayFromString('hello world'))
    conn.onRemoteReset()

    const received: Uint8Array[] = []

    await expect((async () => {
      for await (const buf of conn) {
        received.push(buf.subarray())
      }
    })()).to.eventually.be.rejected
      .with.property('name', 'StreamResetError')

    expect(received).to.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should ignore a remote reset after the stream has closed', async () => {
    const [outbound, inbound] = await streamPair()

    let closes = 0

    inbound.addEventListener('close', () => {
      closes++
    })

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    // eg. a reset frame that arrives after both ends sent FIN
    const conn = inbound as unknown as AbstractMultiaddrConnection
    conn.onRemoteReset()

    expect(closes).to.equal(1)
    expect(inbound.status).to.equal('closed')
    await expect(collect(inbound)).to.eventually.be.empty()
  })

  it('should keep the abort error when the remote resets after an abort', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection
    const err = new Error('urk!')

    let closes = 0

    conn.addEventListener('close', () => {
      closes++
    })

    conn.abort(err)
    conn.onRemoteReset()

    expect(closes).to.equal(1)
    expect(conn.status).to.equal('aborted')
    await expect(collect(conn)).to.eventually.be.rejectedWith(err)
  })

  it('should throw when the remote has already reset', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    conn.onRemoteReset()

    await expect(collect(conn)).to.eventually.be.rejected
      .with.property('name', 'StreamResetError')
  })

  it('should throw when the transport fails while paused', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection
    const err = new Error('ECONNRESET')

    const reading = collect(conn)

    conn.pause()
    conn.onData(uint8ArrayFromString('hello world'))
    conn.onTransportClosed(err)

    await expect(reading).to.eventually.be.rejectedWith(err)
  })

  it('should end when the readable end is closed', async () => {
    const [, inbound] = await streamPair()

    const reading = collect(inbound)

    await inbound.closeRead()

    await expect(reading).to.eventually.be.empty()
  })

  it('should end when closing the readable end fails', async () => {
    const [, inbound] = await streamPair()
    const controller = new AbortController()
    controller.abort()

    const before = collect(inbound)
    const closing = inbound.closeRead({ signal: controller.signal })

    // created while the readable end is closing
    const during = collect(inbound)

    await expect(closing).to.eventually.be.rejected()
    await expect(before).to.eventually.be.empty()
    await expect(during).to.eventually.be.empty()
    expect(inbound.readStatus).to.equal('closed')
  })

  it('should end when data pushed back after the readable end ended is discarded', async () => {
    const [outbound, inbound] = await streamPair()

    await Promise.all([
      pEvent(inbound, 'end'),
      outbound.close()
    ])

    inbound.unshift(uint8ArrayFromString('hello world'))

    const reading = collect(inbound)

    inbound.pause()
    await inbound.closeRead()

    await expect(reading).to.eventually.be.empty()
  })

  it('should remove the message listener when iteration stops early', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection
    const listeners = conn.listenerCount('message')

    conn.push(uint8ArrayFromString('hello world'))

    const iterator = conn[Symbol.asyncIterator]()
    const { value } = await iterator.next()
    await iterator.return(undefined)

    expect(value?.subarray()).to.equalBytes(uint8ArrayFromString('hello world'))
    expect(conn.listenerCount('message')).to.equal(listeners)
  })

  it('should yield all data before throwing when the reader pauses inside the loop and the remote resets', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const received: Uint8Array[] = []

    const reading = (async () => {
      for await (const buf of conn) {
        received.push(buf.subarray())

        if (received.length === 1) {
          // eg. echo() applying backpressure
          conn.pause()
          conn.onData(uint8ArrayFromString('world'))
          conn.onRemoteReset()
          conn.resume()
        }
      }
    })()

    conn.onData(uint8ArrayFromString('hello'))

    await expect(reading).to.eventually.be.rejected
      .with.property('name', 'StreamResetError')

    expect(received).to.deep.equal([uint8ArrayFromString('hello'), uint8ArrayFromString('world')])
  })

  it('should yield data a slow reader has not pulled yet before throwing when the remote resets', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const received: string[] = []

    const reading = (async () => {
      for await (const buf of conn) {
        received.push(new TextDecoder().decode(buf.subarray()))
        await delay(10)
      }
    })()

    conn.onData(uint8ArrayFromString('a'))
    conn.onData(uint8ArrayFromString('b'))
    conn.onData(uint8ArrayFromString('c'))
    conn.onRemoteReset()

    await expect(reading).to.eventually.be.rejected
      .with.property('name', 'StreamResetError')

    expect(received).to.deep.equal(['a', 'b', 'c'])
  })

  it('should end a paused iterator when the stream is aborted after a remote reset', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const reading = collect(conn)

    conn.pause()
    conn.onData(uint8ArrayFromString('hello world'))
    conn.onRemoteReset()
    conn.abort(new Error('give up'))

    await expect(reading).to.eventually.be.rejected
      .with.property('name', 'StreamResetError')
    expect(conn.readBufferLength).to.equal(0)
  })

  it('should end a paused iterator when the stream is aborted after closing', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection
    const err = new Error('give up')

    let closes = 0

    conn.addEventListener('close', () => {
      closes++
    })

    const reading = collect(conn)

    conn.pause()
    conn.onData(uint8ArrayFromString('hello world'))
    conn.onTransportClosed()
    conn.abort(err)

    await expect(reading).to.eventually.be.rejectedWith(err)
    expect(closes).to.equal(1)
    expect(conn.status).to.equal('closed')
  })

  it('should ignore a second remote reset', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const errors: Array<Error | undefined> = []

    conn.addEventListener('close', (evt) => {
      errors.push(evt.error)
    })

    const reading = collect(conn)

    conn.onRemoteReset()
    conn.onRemoteReset()

    expect(errors).to.have.lengthOf(1)
    await expect(reading).to.eventually.be.rejected
      .and.to.equal(errors[0])
  })

  it('should deliver data and the end to concurrent iterators', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const first = collect(conn)
    const second = collect(conn)

    conn.onData(uint8ArrayFromString('hello world'))
    conn.onRemoteCloseWrite()

    await expect(first).to.eventually.deep.equal([uint8ArrayFromString('hello world')])
    await expect(second).to.eventually.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should throw from concurrent iterators when the stream is aborted', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const err = new Error('urk!')

    const first = collect(inbound)
    const second = collect(inbound)

    inbound.abort(err)

    await expect(first).to.eventually.be.rejectedWith(err)
    await expect(second).to.eventually.be.rejectedWith(err)
  })

  it('should leave data unshifted after an iterator ended for the next reader', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const iterator = conn[Symbol.asyncIterator]()
    const first = iterator.next()

    conn.onData(uint8ArrayFromString('hello'))
    conn.onRemoteCloseWrite()

    await expect(first).to.eventually.have.nested.property('value.byteLength', 5)

    // the first iterator has ended but its consumer has not pulled again, eg.
    // a byte stream being unwrapped
    conn.unshift(uint8ArrayFromString('world'))
    await delay(10)

    await expect(collect(conn)).to.eventually.deep.equal([uint8ArrayFromString('world')])
    await iterator.return(undefined)
  })

  it('should end iterators without waiting for closing the readable end to be sent', async () => {
    const [, inbound] = await streamPair()
    const stream = inbound as unknown as AbstractStream

    // eg. a transport that never confirms the close
    Object.defineProperty(stream, 'sendCloseRead', {
      value: async () => new Promise<void>(() => {})
    })

    const before = collect(stream)

    stream.pause()
    stream.onData(uint8ArrayFromString('hello world'))
    void stream.closeRead()

    // created while the readable end is closing, the remote is still writing
    const during = collect(stream)

    await expect(before).to.eventually.be.empty()
    await expect(during).to.eventually.be.empty()
    expect(stream.readStatus).to.equal('closing')
    expect(stream).to.have.property('readableEnded', true)
  })

  it('should end iterators before end listeners run', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const reading = collect(conn)

    // tearing the stream down from an 'end' listener must not turn a clean end
    // into an error
    conn.addEventListener('end', () => {
      conn.abort(new Error('teardown from end listener'))
    })

    conn.onRemoteCloseWrite()

    await expect(reading).to.eventually.be.empty()
  })
})
