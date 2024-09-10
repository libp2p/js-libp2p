/* eslint-env mocha */

import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

describe('Consume peer record', () => {
  let libp2p: Libp2p

  beforeEach(async () => {
    libp2p = await createLibp2p({
      transports: [
        webSockets()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })
  })

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should update addresses when observed addrs are confirmed', async () => {
    let done: () => void

    libp2p.peerStore.patch = async () => {
      done()
      return {} as any
    }

    const p = new Promise<void>(resolve => {
      done = resolve
    })

    await libp2p.start()

    // @ts-expect-error components field is private
    libp2p.components.addressManager.confirmObservedAddr(multiaddr('/ip4/123.123.123.123/tcp/3983'))

    await p

    await libp2p.stop()
  })
})
