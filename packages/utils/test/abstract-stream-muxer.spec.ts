import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { AbstractStreamMuxer } from '../src/abstract-stream-muxer.ts'
import { multiaddrConnectionPair } from '../src/multiaddr-connection-pair.ts'
import type { AbstractStream } from '../src/abstract-stream.ts'
import type { MessageStream } from '@libp2p/interface'

class FailingMuxer extends AbstractStreamMuxer {
  constructor (maConn: MessageStream) {
    super(maConn, { protocol: '/failing/1.0.0', name: 'failing' })
  }

  onCreateStream (): AbstractStream {
    throw new Error('not implemented')
  }

  onData (): void {
    throw new Error('bad data')
  }

  abort (err: Error): void {
    super.abort(err)
    throw new Error('abort failed')
  }
}

describe('abstract-stream-muxer', () => {
  it('should abort the underlying connection when aborting the muxer throws', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()
    const muxer = new FailingMuxer(inbound)

    const closed = pEvent(inbound, 'close')
    outbound.send(Uint8Array.from([0, 1, 2, 3]))
    await closed

    expect(muxer.status).to.equal('closed')
    expect(inbound.status).to.equal('aborted')
  })
})
