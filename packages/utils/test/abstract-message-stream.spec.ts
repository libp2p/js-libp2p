import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { multiaddrConnectionPair } from '../src/multiaddr-connection-pair.ts'

describe('abstract message stream', () => {
  it('records timeline.lastReadAt when data is received', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    // nothing has been read yet
    expect(inbound.timeline.lastReadAt).to.be.undefined()

    const message = pEvent(inbound, 'message')
    outbound.send(uint8ArrayFromString('ping'))
    await message

    expect(inbound.timeline.lastReadAt).to.be.a('number')
  })
})
