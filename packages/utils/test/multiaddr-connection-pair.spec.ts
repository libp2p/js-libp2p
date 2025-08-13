import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { multiaddrConnectionPair } from '../src/multiaddr-connection-pair.ts'

describe('multiaddr-conection-pair', () => {
  it('should send data', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    const sent: Uint8Array[] = []
    const received: Uint8Array[] = []

    await inbound.closeWrite()

    inbound.addEventListener('message', (evt) => {
      received.push(evt.data.subarray())
    })

    for (let i = 0; i < 1_000; i++) {
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
      outbound.closeWrite()
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
          const buf = uint8ArrayFromString(`send data ${i}`)
          const sendMore = outbound.send(buf)

          if (!sendMore) {
            await pEvent(outbound, 'drain', {
              rejectionEvents: ['close']
            })
          }
        }

        await outbound.closeWrite()
      })(),
      (async () => {
        for (let i = 0; i < messages; i++) {
          const buf = uint8ArrayFromString(`send data ${i}`)
          const sendMore = inbound.send(buf)

          if (!sendMore) {
            await pEvent(inbound, 'drain', {
              rejectionEvents: ['close']
            })
          }
        }

        await inbound.closeWrite()
      })()
    ])

    await Promise.all([
      pEvent(outbound, 'close'),
      pEvent(inbound, 'close')
    ])

    expect(outboundReceived).to.have.lengthOf(messages)
    expect(inboundReceived).to.have.lengthOf(messages)
  })
})
