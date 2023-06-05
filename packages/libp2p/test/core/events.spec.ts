/* eslint-env mocha */

import { webSockets } from '@libp2p/websockets'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { createLibp2p } from '../../src/index.js'
import { plaintext } from '../../src/insecure/index.js'
import type { Libp2p } from '@libp2p/interface-libp2p'

describe('events', () => {
  let node: Libp2p

  afterEach(async () => {
    if (node != null) {
      await node.stop()
    }
  })

  it('should emit a start event', async () => {
    node = await createLibp2p({
      start: false,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    const eventPromise = pEvent<'start', CustomEvent<Libp2p>>(node, 'start')

    await node.start()
    await expect(eventPromise).to.eventually.have.property('detail', node)
  })

  it('should emit a stop event', async () => {
    node = await createLibp2p({
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    const eventPromise = pEvent<'stop', CustomEvent<Libp2p>>(node, 'stop')

    await node.stop()
    await expect(eventPromise).to.eventually.have.property('detail', node)
  })
})
