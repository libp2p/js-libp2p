import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
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
})
