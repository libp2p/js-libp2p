import { multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { mplex } from '../src/index.ts'

async function sleep (ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

describe('mplex', () => {
  it('should not close the connection for messages sent before the remote saw a local reset', async () => {
    const [outbound, inbound] = multiaddrConnectionPair({
      capacity: 100
    })
    const factory = mplex()()
    const outboundMuxer = factory.createStreamMuxer(outbound)
    const inboundMuxer = factory.createStreamMuxer(inbound)

    inboundMuxer.addEventListener('stream', (evt) => {
      const remoteStream = evt.detail

      remoteStream.addEventListener('message', () => {
        remoteStream.abort(new Error('Urk!'))
      }, {
        once: true
      })
    })

    const stream = await outboundMuxer.createStream()

    // more messages than the disconnect threshold are in flight when the reset is sent
    for (let i = 0; i < 20; i++) {
      stream.send(Uint8Array.from([i]))
    }

    await pEvent(stream, 'close')
    await sleep(100)

    expect(inboundMuxer.status).to.equal('open')
    expect(inbound.status).to.equal('open')
  })
})
