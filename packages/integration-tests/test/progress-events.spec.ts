import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createPeers } from './fixtures/create-peers.ts'
import type { Echo } from '@libp2p/echo'
import type { Libp2p } from 'libp2p'
import type { ProgressEventListener } from 'progress-events'

describe('events', () => {
  let dialer: Libp2p<{ echo: Echo }>
  let listener: Libp2p<{ echo: Echo }>

  afterEach(async () => {
    await stop(dialer, listener)
  })

  it('should notify of connect events', async () => {
    ({ dialer, listener } = await createPeers())

    const events = new Map<string, number>()

    await dialer.dial(listener.getMultiaddrs(), {
      onProgress: (evt) => {
        let count = events.get(evt.type) ?? 0
        count++

        events.set(evt.type, count)
      }
    })

    expect(events.get('connection:open')).to.equal(1)
    expect(events.get('connection:opened')).to.equal(1)
  })

  it('should notify of connect events when node is already connected', async () => {
    ({ dialer, listener } = await createPeers())

    const events = new Map<string, number>()
    const onProgress: ProgressEventListener = (evt) => {
      let count = events.get(evt.type) ?? 0
      count++

      events.set(evt.type, count)
    }

    await dialer.dial(listener.getMultiaddrs(), {
      onProgress
    })
    await dialer.dial(listener.getMultiaddrs(), {
      onProgress
    })

    expect(events.get('connection:open')).to.equal(2)
    expect(events.get('connection:opened')).to.equal(2)
  })

  it('should notify of stream events', async () => {
    ({ dialer, listener } = await createPeers())

    const events = new Map<string, number>()
    const onProgress: ProgressEventListener = (evt) => {
      let count = events.get(evt.type) ?? 0
      count++

      events.set(evt.type, count)
    }

    await dialer.services.echo.echo(listener.getMultiaddrs(), Uint8Array.from([0, 1, 2, 3]), {
      onProgress
    })

    expect(events.get('connection:open-stream')).to.equal(1)
    expect(events.get('connection:opened-stream')).to.equal(1)
  })
})
