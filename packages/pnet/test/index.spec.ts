import { StreamMessageEvent } from '@libp2p/interface'
import { multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import xsalsa20 from 'xsalsa20'
import { BoxMessageStream } from '../src/crypto.ts'
import { INVALID_PSK } from '../src/errors.ts'
import { preSharedKey, generateKey } from '../src/index.ts'
import type { MessageStream, MultiaddrConnection, StreamCloseEvent } from '@libp2p/interface'

const swarmKeyBuffer = new Uint8Array(95)
const wrongSwarmKeyBuffer = new Uint8Array(95)

// Write new psk files to the buffers
generateKey(swarmKeyBuffer)
generateKey(wrongSwarmKeyBuffer)

// distinct bytes, so a reordering of either is visible
const nonce = (seed: number): Uint8Array => Uint8Array.from({ length: 24 }, (_, i) => (i * 7 + seed) & 0xff)
const key = (seed: number): Uint8Array => Uint8Array.from({ length: 32 }, (_, i) => (i * 11 + seed) & 0xff)

/**
 * xsalsa20 nulls a cipher's backend once its slot in the shared wasm memory has
 * been returned to the pool, so read that rather than trusting a finalize call
 * to have succeeded
 */
function releasedCiphers (conn: any): string[] {
  return ['inboundXor', 'outboundXor'].filter(name => {
    const cipher = conn[name]

    // fail loudly if the field ever goes away, otherwise every release
    // assertion in this file silently passes
    if (!('_xor' in cipher)) {
      throw new Error(`xsalsa20 no longer exposes _xor, ${name} cannot be checked`)
    }

    return cipher._xor === null
  })
}

function cipherSlots (conn: any): number[] {
  return ['inboundXor', 'outboundXor'].map(name => {
    const pointer = conn[name]._xor?._pointer

    if (typeof pointer !== 'number') {
      throw new Error(`xsalsa20 no longer exposes _pointer, ${name} cannot be checked`)
    }

    return pointer
  }).sort((a, b) => a - b)
}

function boxOver (maConn: MultiaddrConnection): BoxMessageStream {
  return new BoxMessageStream({
    maConn,
    localNonce: nonce(1),
    remoteNonce: nonce(2),
    psk: key(3),
    log: maConn.log
  })
}

describe('private network', () => {
  it('should accept a valid psk buffer', () => {
    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    expect(protector).to.have.property('tag', '/key/swarm/psk/1.0.0/')
  })

  it('should protect a simple connection', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      delay: 10
    })

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    const output: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    const message = uint8ArrayFromString('hello world')
    const beforeSend = message.slice()

    outbound.send(message)
    outbound.send(uint8ArrayFromString('doo dah'))

    // send runs sendData synchronously, so this needs no wait
    expect(message, 'encrypting overwrote the buffer the caller still owns').to.equalBytes(beforeSend)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(output).to.deep.equal([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  it('should decrypt a message spanning many chunks', async () => {
    const [, maConn] = multiaddrConnectionPair()
    const remoteNonce = nonce(2)
    const psk = key(3)

    // not a whole number of chunks, so the final partial one is covered
    const message = new Uint8Array((64 * 1024 * 3) + 12345)

    for (let i = 0; i < message.byteLength; i++) {
      message[i] = i % 251
    }

    const stream = boxOver(maConn)

    const output: Uint8Array[] = []

    stream.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    // encrypted in one update, so decrypting it in chunks has to produce the
    // same bytes or pnet cannot talk to any other implementation
    maConn.push(xsalsa20(remoteNonce, psk).update(message))

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(new Uint8ArrayList(...output).subarray()).to.equalBytes(message)
  })

  it('should protect a message larger than the xsalsa20 wasm memory limit', async () => {
    // the limit is 62.5MiB, and the extra bytes stop the message being a whole
    // number of chunks
    const message = new Uint8Array((64 * 1024 * 1024) + 12345)

    // a repeating pattern with a period that does not divide the chunk size, so
    // a reordered or dropped chunk shows up as corruption
    for (let i = 0; i < message.byteLength; i++) {
      message[i] = i % 251
    }

    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      // the default is one chunk, so widen it to make the inbound side loop.
      // not a multiple of the chunk size, otherwise both ends chunk on the same
      // boundaries and a cipher driven wrongly at both ends still round-trips
      chunkSize: 1000 * 1000
    })

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    let received = 0
    let corruptAt = -1

    inbound.addEventListener('message', (evt) => {
      const bytes = evt.data.subarray()

      for (let i = 0; corruptAt === -1 && i < bytes.byteLength; i++) {
        if (bytes[i] !== (received + i) % 251) {
          corruptAt = received + i
        }
      }

      received += bytes.byteLength
    })

    outbound.send(message)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(corruptAt, 'plaintext corrupted at byte offset').to.equal(-1)
    expect(received).to.equal(message.byteLength)
  })

  it('should release both ciphers however the connection ends', async () => {
    const endings: Record<string, (outbound: MessageStream, inbound: MessageStream) => Promise<any>> = {
      'closed locally': async (outbound, inbound) => Promise.all([
        pEvent(inbound, 'close'),
        outbound.close()
      ]),
      'aborted locally': async (outbound, inbound) => {
        // close can propagate synchronously, so listen before aborting
        const closed = pEvent(inbound, 'close')

        outbound.abort(new Error('urk!'))

        return closed
      },
      'reset by the remote': async (outbound, inbound) => {
        const closed = pEvent(outbound, 'close')

        inbound.abort(new Error('urk!'))

        return closed
      }
    }

    for (const [ending, end] of Object.entries(endings)) {
      const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

      const protector = preSharedKey({
        psk: swarmKeyBuffer
      })()

      const [outbound, inbound] = await Promise.all([
        protector.protect(outboundConnection),
        protector.protect(inboundConnection)
      ])

      await end(outbound, inbound)

      expect(releasedCiphers(outbound).sort(), ending).to.deep.equal(['inboundXor', 'outboundXor'])
    }
  })

  it('should survive a cipher that cannot be released', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    // one update larger than the wasm memory's initial size grows it, which
    // detaches every other cipher's cached view of it and makes finalize throw
    xsalsa20(nonce(9), key(9)).update(new Uint8Array(1024 * 1024))

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    // the slots leak, but a failure to release one must not escape the listener
    // it is called from, where it would take the process down
    expect(outbound).to.have.property('status', 'closed')
    expect(releasedCiphers(outbound), 'a detached cipher cannot be released').to.be.empty()
  })

  it('should decrypt data the connection received before it closed', async () => {
    const [, maConn] = multiaddrConnectionPair()
    const stream = boxOver(maConn)
    const message = uint8ArrayFromString('hello world')

    const output: Uint8Array[] = []

    stream.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    // the application applies backpressure, which pauses the connection under
    // it, so bytes it receives are not decrypted yet
    stream.pause()
    maConn.push(xsalsa20(nonce(2), key(3)).update(message))

    // the transport drops while those bytes are still held
    await maConn.close()

    // the stream must still finish, anything above it hangs off this
    expect(stream).to.have.property('status', 'closed')

    // and refuse writes the way a closed stream does, not by using a released
    // cipher
    expect(() => {
      stream.send(uint8ArrayFromString('nope'))
    }).to.throw().with.property('name', 'StreamStateError')

    stream.resume()

    expect(output).to.deep.equal([message])
  })

  it('should keep sending after the remote half closes', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    const output: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    // the remote closes its writable end, so nothing more arrives but this end
    // can still write
    ;(outboundConnection as any).onRemoteCloseWrite()

    expect(releasedCiphers(outbound)).to.deep.equal(['inboundXor'])

    const message = uint8ArrayFromString('still writable')

    outbound.send(message)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(output).to.deep.equal([message])
  })

  it('should release the inbound cipher when a reset abandons buffered data', async () => {
    const [, maConn] = multiaddrConnectionPair()
    const stream = boxOver(maConn)

    stream.addEventListener('message', () => {})

    stream.pause()
    maConn.push(xsalsa20(nonce(2), key(3)).update(uint8ArrayFromString('hello world')))

    // a reset abandons the buffered bytes, so 'end' never comes
    ;(maConn as any).onRemoteReset()

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(releasedCiphers(stream).sort()).to.deep.equal(['inboundXor', 'outboundXor'])
  })

  it('should decrypt a message delivered as a Uint8Array', async () => {
    const [, maConn] = multiaddrConnectionPair()
    const stream = boxOver(maConn)
    const message = uint8ArrayFromString('hello world')

    const output: Uint8Array[] = []

    stream.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    const ciphertext = xsalsa20(nonce(2), key(3)).update(message)
    const beforeDecrypt = ciphertext.slice()

    // in-tree transports always deliver a Uint8ArrayList, so nothing else
    // covers the branch an out-of-tree one would take
    maConn.dispatchEvent(new StreamMessageEvent(ciphertext))

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(output).to.deep.equal([message])
    expect(ciphertext, 'decrypting overwrote the buffer the transport still owns').to.equalBytes(beforeDecrypt)
  })

  it('should close gracefully when the consumer writes as the connection drains', async () => {
    const [, maConn] = multiaddrConnectionPair()
    const stream = boxOver(maConn)

    let sendError: string | undefined

    stream.addEventListener('message', () => {
      // a muxer replies to what it reads, and here it is reading bytes the
      // connection had already received when it closed
      try {
        stream.send(uint8ArrayFromString('reply'))
      } catch (err: any) {
        sendError = err.name
      }
    })

    // the connection holds bytes it received, but this stream is readable, so
    // the drain dispatches them straight to the consumer
    ;(maConn as any).readStatus = 'paused'
    maConn.push(xsalsa20(nonce(2), key(3)).update(uint8ArrayFromString('hello world')))

    await maConn.close()

    // the write has to be refused by the stream itself, otherwise it reaches a
    // released cipher and aborts what should be a graceful close
    expect(sendError, 'the write was not refused').to.equal('StreamStateError')
    expect(stream).to.have.property('status', 'closed')
  })

  it('should stop decrypting when the consumer aborts part way through a message', async () => {
    const [, maConn] = multiaddrConnectionPair()
    const stream = boxOver(maConn)

    let updates = 0
    const xor: any = (stream as any).inboundXor
    const update = xor.update.bind(xor)

    xor.update = (...args: any[]) => {
      updates++

      return update(...args)
    }

    const received: Uint8Array[] = []

    stream.addEventListener('message', (evt) => {
      received.push(evt.data.subarray())
      // tearing down from the handler releases the cipher while the rest of
      // the message is still waiting to be decrypted
      stream.abort(new Error('urk!'))
    })

    const cipher = xsalsa20(nonce(2), key(3))

    maConn.dispatchEvent(new StreamMessageEvent(new Uint8ArrayList(
      cipher.update(uint8ArrayFromString('first')),
      cipher.update(uint8ArrayFromString('second'))
    )))

    // without these the assertion below can pass without reaching the case
    expect(received, 'the first buffer never reached the consumer').to.have.lengthOf(1)
    expect(stream).to.have.property('inboundReleased', true)

    expect(updates, 'the released cipher was used').to.equal(1)
  })

  it('should reuse the wasm slots a closed connection gave back', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    const freed = cipherSlots(outbound)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    // the pool is a LIFO free list, so the next connection takes these back
    const [, next] = multiaddrConnectionPair()
    const reused = boxOver(next)

    expect(cipherSlots(reused), 'the freed slots were not reused').to.deep.equal(freed)
  })

  it('should ignore data that arrives after the readable end has ended', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    const output: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(inboundConnection).to.have.property('readableEnded', true)

    let updates = 0
    const xor = (inbound as any).inboundXor
    const update = xor.update.bind(xor)

    xor.update = (...args: any[]) => {
      updates++

      return update(...args)
    }

    // a peer can send data after closing and nothing upstream rejects it, so
    // it must not reach the released cipher
    // a bare Uint8Array skips the per buffer loop, so the guard at the top of
    // the handler is the only thing in the way
    inboundConnection.dispatchEvent(new StreamMessageEvent(uint8ArrayFromString('too late')))

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(updates, 'the released cipher was used').to.equal(0)
  })

  it('should decrypt bytes unwrapped back onto the connection after it ended', async () => {
    const [, maConn] = multiaddrConnectionPair()

    // a half close ends the readable end while leaving it open, which is the
    // state the handshake unwrap pushes bytes back into
    ;(maConn as any).onRemoteCloseWrite()

    expect(maConn).to.have.property('readableEnded', true)

    const message = uint8ArrayFromString('hello world')

    // the peer pipelined this behind the nonce, so byteStream.unwrap() hands it
    // back before BoxMessageStream is constructed
    ;(maConn as any).onData(xsalsa20(nonce(2), key(3)).update(message))

    const stream = boxOver(maConn)

    const output: Uint8Array[] = []

    stream.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(output).to.deep.equal([message])
  })

  it('should release both ciphers when the connection ended before the stream was created', async () => {
    const [, maConn] = multiaddrConnectionPair()

    // the handshake reads from the connection before this stream exists
    ;(maConn as any).onTransportClosed()

    expect(maConn).to.have.property('readableEnded', true)

    const stream = boxOver(maConn)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(releasedCiphers(stream).sort()).to.deep.equal(['inboundXor', 'outboundXor'])

    // a stream handed back over a dead connection must not report itself open
    expect(stream).to.have.property('status', 'closed')
  })

  it('should abort the connection when the cipher throws on inbound data', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      delay: 10
    })

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    const err = new Error('cipher failed')

    // stub the cipher to throw, as it does when the xsalsa20 wasm memory limit
    // is reached
    const cipher: xsalsa20.Xor = {
      update: () => {
        throw err
      },
      finalize: () => {}
    }

    // @ts-expect-error inboundXor is not on the MultiaddrConnection interface
    inbound.inboundXor = cipher

    // attach before sending, the abort can be dispatched synchronously
    const closed = Promise.all([
      pEvent<'close', StreamCloseEvent>(inbound, 'close'),
      pEvent(outbound, 'close')
    ])

    outbound.send(uint8ArrayFromString('hello world'))

    const [evt] = await closed

    expect(evt.error).to.equal(err)
    expect(inbound).to.have.property('status', 'aborted')
    expect(inboundConnection).to.have.property('status', 'aborted')
    expect(outbound).to.have.property('status', 'reset')
  })

  it('should pass on data decrypted before the cipher throws mid-message', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      delay: 10
    })

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    const err = new Error('cipher failed')
    let updates = 0

    // throw on the second buffer of the message so the first has already been
    // emitted
    const cipher: xsalsa20.Xor = {
      update: (input, output) => {
        if (++updates > 1) {
          throw err
        }

        // the real cipher writes into the output buffer when it is passed one
        output?.set(input)

        return (output ?? input) as any
      },
      finalize: () => {}
    }

    // @ts-expect-error inboundXor is not on the MultiaddrConnection interface
    inbound.inboundXor = cipher

    const received: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      received.push(evt.data.subarray())
    })

    // dispatching directly is synchronous, so attach first
    const closed = pEvent<'close', StreamCloseEvent>(inbound, 'close')

    inboundConnection.dispatchEvent(new StreamMessageEvent(new Uint8ArrayList(
      uint8ArrayFromString('hello world'),
      uint8ArrayFromString('doo dah')
    )))

    const evt = await closed

    expect(received).to.deep.equal([uint8ArrayFromString('hello world')])
    expect(updates).to.equal(2)
    expect(evt.error).to.equal(err)
    expect(inbound).to.have.property('status', 'aborted')
    expect(inboundConnection).to.have.property('status', 'aborted')
  })

  it('should forward drain events from the underlying connection', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      delay: 10
    })

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    let received = 0

    inbound.addEventListener('message', (evt) => {
      received += evt.data.byteLength
    })

    // send more data than the underlying connection can buffer, awaiting a
    // 'drain' each time it reports backpressure
    const chunk = new Uint8Array(1024 * 64)
    let sent = 0

    let backpressure = 0

    for (let i = 0; i < 25; i++) {
      if (!outbound.send(chunk)) {
        backpressure++

        await pEvent(outbound, 'drain', {
          timeout: 5_000,
          rejectionEvents: ['close']
        })
      }

      sent += chunk.byteLength
    }

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(received).to.equal(sent)
    expect(backpressure, 'the connection never reported backpressure').to.be.greaterThan(0)
  })

  it('should not be able to share correct data with different keys', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      delay: 10
    })
    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()
    const protectorB = preSharedKey({
      psk: wrongSwarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protectorB.protect(inboundConnection)
    ])

    const output: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    const message = uint8ArrayFromString('hello world')

    outbound.send(message)

    await new Promise(resolve => setTimeout(resolve, 50))

    // closing first discards the data, and then the assertion below is
    // satisfied by an empty array whatever the keys are
    expect(output, 'nothing was delivered').to.have.lengthOf(1)
    expect(output[0]).to.not.equalBytes(message)
  })

  describe('invalid pre-shared keys', () => {
    it('should not accept a bad psk', () => {
      expect(() => {
        return preSharedKey({
          psk: uint8ArrayFromString('not-a-key')
        })()
      }).to.throw(INVALID_PSK)
    })

    it('should not accept a psk of incorrect length', () => {
      expect(() => {
        return preSharedKey({
          psk: uint8ArrayFromString('/key/swarm/psk/1.0.0/\n/base16/\ndffb7e')
        })()
      }).to.throw(INVALID_PSK)
    })
  })
})
