import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { multiaddrConnectionPair } from '../src/multiaddr-connection-pair.ts'

describe('multiaddr-conection-pair', () => {
  it('should send data', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    const sent: Uint8Array[] = []
    const received: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      received.push(evt.data.subarray())
    })

    for (let i = 0; i < 1_000; i++) {
      if (outbound.status !== 'open') {
        break
      }

      const buf = uint8ArrayFromString(`send data ${i}`)
      sent.push(buf)

      const sendMore = outbound.send(buf)

      if (!sendMore) {
        await pEvent(outbound, 'drain', {
          rejectionEvents: ['close']
        })
      }
    }

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close()
    ])

    expect(received).to.deep.equal(sent)
  })

  it('should read and write data simultaneously', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    const messages = 10
    const outboundReceived: Uint8Array[] = []
    const inboundReceived: Uint8Array[] = []

    outbound.addEventListener('message', (evt) => {
      outboundReceived.push(evt.data.subarray())
    })
    inbound.addEventListener('message', (evt) => {
      inboundReceived.push(evt.data.subarray())
    })

    await Promise.all([
      (async () => {
        for (let i = 0; i < messages; i++) {
          if (outbound.status !== 'open') {
            break
          }

          const buf = uint8ArrayFromString(`send data ${i}`)
          const sendMore = outbound.send(buf)

          if (!sendMore) {
            await pEvent(outbound, 'drain', {
              rejectionEvents: ['close']
            })
          }
        }
      })(),
      (async () => {
        for (let i = 0; i < messages; i++) {
          if (outbound.status !== 'open') {
            break
          }

          const buf = uint8ArrayFromString(`send data ${i}`)
          const sendMore = inbound.send(buf)

          if (!sendMore) {
            await pEvent(inbound, 'drain', {
              rejectionEvents: ['close']
            })
          }
        }
      })()
    ])

    await Promise.all([
      pEvent(outbound, 'close'),
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    expect(outboundReceived).to.have.lengthOf(messages)
    expect(inboundReceived).to.have.lengthOf(messages)
  })

  it('should send large amounts of data in both directions', async () => {
    const [outbound, inbound] = multiaddrConnectionPair({
      inbound: {
        maxMessageSize: 1024 * 64
      },
      outbound: {
        maxMessageSize: 1024 * 64
      }
    })
    const chunks = 255
    const chunkSize = 1024 * 1024 * 5
    const dataLength = chunks * chunkSize
    const allDataReceived = Promise.withResolvers<void>()

    const sent = new Array(chunks)
      .fill(0)
      .map((val, index) => new Uint8Array(chunkSize).fill(index))

    const outboundReceived = new Uint8ArrayList()
    const inboundReceived = new Uint8ArrayList()

    outbound.addEventListener('message', (evt) => {
      outboundReceived.append(evt.data)

      if (outboundReceived.byteLength >= dataLength && inboundReceived.byteLength >= dataLength) {
        setTimeout(() => {
          allDataReceived.resolve()
        }, 1_000)
      }
    })
    inbound.addEventListener('message', (evt) => {
      inboundReceived.append(evt.data)

      if (outboundReceived.byteLength >= dataLength && inboundReceived.byteLength >= dataLength) {
        setTimeout(() => {
          allDataReceived.resolve()
        }, 1_000)
      }
    })

    // send data in both directions simultaneously
    await Promise.all([
      allDataReceived.promise,
      (async () => {
        for (const buf of sent) {
          if (!outbound.send(buf)) {
            await pEvent(outbound, 'drain', {
              rejectionEvents: [
                'close'
              ]
            })
          }
        }

        //
      })(),
      (async () => {
        for (const buf of sent) {
          if (!inbound.send(buf)) {
            await pEvent(inbound, 'drain', {
              rejectionEvents: [
                'close'
              ]
            })
          }
        }
      })()
    ])

    await outbound.close()
    await inbound.close()

    expect(new Uint8ArrayList(...outboundReceived)).to.have.property('byteLength', new Uint8ArrayList(...sent).byteLength)
    expect(new Uint8ArrayList(...inboundReceived)).to.have.property('byteLength', new Uint8ArrayList(...sent).byteLength)
  })
})
