import { StreamMessageEvent } from '@libp2p/interface'
import { multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { INVALID_PSK } from '../src/errors.ts'
import { preSharedKey, generateKey } from '../src/index.ts'
import type { StreamCloseEvent } from '@libp2p/interface'
import type xsalsa20 from 'xsalsa20'

const swarmKeyBuffer = new Uint8Array(95)
const wrongSwarmKeyBuffer = new Uint8Array(95)

// Write new psk files to the buffers
generateKey(swarmKeyBuffer)
generateKey(wrongSwarmKeyBuffer)

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

    outbound.send(uint8ArrayFromString('hello world'))
    outbound.send(uint8ArrayFromString('doo dah'))

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(output).to.deep.equal([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
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
      update: (input) => {
        if (++updates > 1) {
          throw err
        }

        return input as any
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

    for (let i = 0; i < 25; i++) {
      if (!outbound.send(chunk)) {
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

    outbound.send(uint8ArrayFromString('hello world'))
    outbound.send(uint8ArrayFromString('doo dah'))

    const output: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    outbound.send(uint8ArrayFromString('hello world'))
    outbound.send(uint8ArrayFromString('doo dah'))

    await Promise.all([
      outbound.close(),
      inbound.close()
    ])

    expect(output).to.not.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
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
