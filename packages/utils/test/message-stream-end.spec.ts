import { expect } from 'aegir/chai'
import delay from 'delay'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { multiaddrConnectionPair } from '../src/multiaddr-connection-pair.ts'
import { streamPair } from '../src/stream-pair.ts'
import type { AbstractMultiaddrConnection } from '../src/abstract-multiaddr-connection.ts'

describe('message stream end event', () => {
  it('should emit end when the transport closes', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    expect(inbound).to.have.property('readableEnded', false)

    const order: string[] = []

    let status: string | undefined
    let closeTime: number | undefined

    inbound.addEventListener('end', () => {
      order.push('end')
      status = inbound.status
      closeTime = inbound.timeline.close
    })
    inbound.addEventListener('close', () => {
      order.push('close')
    })

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(order).to.deep.equal(['end', 'close'])

    // the stream must be fully closed before listeners run
    expect(status).to.equal('closed')
    expect(closeTime).to.be.a('number')

    // late consumers read this instead of waiting for an event that already fired
    expect(inbound).to.have.property('readableEnded', true)
  })

  it('should not emit end until buffered data has been read', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    let ended = false

    inbound.addEventListener('end', () => {
      ended = true
    })

    // no 'message' listener yet, so the data stays in the read buffer
    outbound.send(uint8ArrayFromString('hello world'))

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(ended, 'ended while data was still buffered').to.be.false()

    const received: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      received.push(evt.data.subarray())
    })

    await pEvent(inbound, 'end')

    expect(received).to.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should emit end when the remote closes their writable end', async () => {
    const [outbound, inbound] = await streamPair()

    const order: string[] = []

    inbound.addEventListener('message', () => {})
    inbound.addEventListener('remoteCloseWrite', () => {
      order.push('remoteCloseWrite')
    })
    inbound.addEventListener('end', () => {
      order.push('end')
    })

    await Promise.all([
      pEvent(inbound, 'end'),
      outbound.close()
    ])

    expect(order).to.deep.equal(['remoteCloseWrite', 'end'])

    // the remote only closed their writable end, so this end stays readable
    // and writable
    expect(inbound.readStatus).to.equal('readable')
    expect(inbound.writeStatus).to.equal('writable')
  })

  it('should emit end once when an end listener closes the stream', async () => {
    const [outbound, inbound] = await streamPair()

    let ends = 0

    inbound.addEventListener('message', () => {})
    inbound.addEventListener('end', () => {
      ends++

      // the stream is still open, so aborting re-enters the readable end
      // closing - 'end' must not fire twice
      inbound.abort(new Error('teardown from end listener'))
    })

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(ends).to.equal(1)
  })

  it('should not emit end before buffered data when the remote closes their writable end', async () => {
    const [outbound, inbound] = await streamPair()

    const order: string[] = []

    inbound.addEventListener('end', () => {
      order.push('end')
    })

    // no 'message' listener yet, so the data stays in the read buffer
    outbound.send(uint8ArrayFromString('hello world'))

    await Promise.all([
      pEvent(inbound, 'remoteCloseWrite'),
      outbound.close()
    ])

    expect(order, 'ended while data was still buffered').to.be.empty()

    inbound.addEventListener('message', () => {
      order.push('message')
    })

    await pEvent(inbound, 'end')

    expect(order).to.deep.equal(['message', 'end'])
  })

  it('should emit end when the readable end is closed locally', async () => {
    const [, inbound] = await streamPair()

    await Promise.all([
      pEvent(inbound, 'end'),
      inbound.closeRead()
    ])

    expect(inbound.readStatus).to.equal('closed')
  })

  it('should finish closing before emitting end when the transport fails', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection
    const err = new Error('ECONNRESET')
    const closed: Array<Error | undefined> = []

    let status: string | undefined
    let ends = 0

    conn.addEventListener('message', () => {})
    conn.addEventListener('end', () => {
      ends++
      status = conn.status

      // tearing the stream down from an 'end' listener must not mask the error
      // that closed the transport, or cause a second 'end' event
      conn.abort(new Error('teardown from end listener'))
    })
    conn.addEventListener('close', (evt) => {
      closed.push(evt.error)
    })

    conn.onTransportClosed(err)

    expect(status, 'the stream was still open when end was emitted').to.equal('aborted')
    expect(ends).to.equal(1)
    expect(closed).to.have.lengthOf(1)
    expect(closed[0]).to.equal(err)
  })

  it('should emit end when the transport closes while paused', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    conn.addEventListener('message', () => {})
    conn.pause()

    const end = pEvent(conn, 'end')

    conn.onTransportClosed()

    await end

    // onTransportClosed only closes a 'readable' readable end, so a paused
    // stream ends without readStatus changing
    expect(conn.readStatus).to.equal('paused')
  })

  it('should emit end before close when the stream is aborted', async () => {
    const [, inbound] = multiaddrConnectionPair()

    const order: string[] = []

    let closeTime: number | undefined

    inbound.addEventListener('end', () => {
      order.push('end')
      closeTime = inbound.timeline.close
    })
    inbound.addEventListener('close', () => {
      order.push('close')
    })

    inbound.abort(new Error('urk!'))

    expect(order).to.deep.equal(['end', 'close'])

    // the stream must be fully closed before listeners run
    expect(closeTime).to.be.a('number')
  })

  it('should emit end before close when the remote resets with no buffered data', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    const order: string[] = []

    conn.addEventListener('end', () => {
      order.push('end')
    })
    conn.addEventListener('close', () => {
      order.push('close')
    })

    conn.onRemoteReset()

    expect(order).to.deep.equal(['end', 'close'])
  })

  it('should emit end after buffered data has been read when the remote resets', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    // no 'message' listener, so the data stays in the read buffer
    conn.push(uint8ArrayFromString('hello world'))

    let ended = false

    conn.addEventListener('end', () => {
      ended = true
    })

    conn.onRemoteReset()

    expect(ended, 'ended while data was still buffered').to.be.false()

    const received: Uint8Array[] = []

    conn.addEventListener('message', (evt) => {
      received.push(evt.data.subarray())
    })

    await pEvent(conn, 'end')

    expect(received).to.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should not emit end while buffered data cannot be delivered', async () => {
    const [, inbound] = multiaddrConnectionPair()
    const conn = inbound as AbstractMultiaddrConnection

    conn.push(uint8ArrayFromString('hello world'))
    conn.pause()

    let ended = false

    conn.addEventListener('end', () => {
      ended = true
    })

    conn.onTransportClosed()

    const received: Uint8Array[] = []

    conn.addEventListener('message', (evt) => {
      received.push(evt.data.subarray())
    })

    await delay(10)

    expect(ended, 'ended while paused with buffered data').to.be.false()
    expect(conn.readBufferLength, 'buffered data was dropped').to.equal(11)

    // 'end' is dispatched synchronously by resume() so listen before resuming
    const end = pEvent(conn, 'end')
    conn.resume()
    await end

    expect(received).to.deep.equal([uint8ArrayFromString('hello world')])
  })

  it('should emit one message event when data is pushed back after end', async () => {
    const [outbound, inbound] = await streamPair()

    await Promise.all([
      pEvent(inbound, 'end'),
      outbound.close()
    ])

    // eg. a byte stream being unwrapped after the remote finished
    inbound.unshift(uint8ArrayFromString('world'))
    inbound.unshift(uint8ArrayFromString('hello '))

    // data arriving after 'end' does not un-emit it
    expect(inbound).to.have.property('readableEnded', true)

    const messages: string[] = []

    inbound.addEventListener('message', (evt) => {
      messages.push(new TextDecoder().decode(evt.data.subarray()))
    })

    await pEvent(inbound, 'message')

    expect(messages).to.deep.equal(['hello world'])

    // the readable end closes after the buffer drains, so no more can follow
    expect(inbound.readStatus).to.equal('closed')
    expect(() => inbound.unshift(uint8ArrayFromString('again'))).to.throw()
      .with.property('name', 'StreamStateError')
  })

  it('should emit end once when the remote closes their writable end and then the stream closes', async () => {
    const [outbound, inbound] = await streamPair()

    let ends = 0

    inbound.addEventListener('end', () => {
      ends++
    })

    await Promise.all([
      pEvent(inbound, 'end'),
      outbound.close()
    ])

    // both ends are now closed for writing so the stream closes, which closes
    // the readable end - 'end' is not emitted a second time
    await Promise.all([
      pEvent(inbound, 'close'),
      inbound.close()
    ])

    expect(ends).to.equal(1)
    expect(inbound.readStatus).to.equal('closed')
  })
})
