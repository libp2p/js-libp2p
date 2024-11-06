/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { echo } from '@libp2p/echo'
import { memory } from '@libp2p/memory'
import { plaintext } from '@libp2p/plaintext'
import { createLibp2p } from 'libp2p'
import type { Echo } from '@libp2p/echo'
import type { Libp2p } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

async function createNode (config: Partial<Libp2pOptions<{ echo: Echo }>> = {}): Promise<Libp2p<{ echo: Echo }>> {
  const node = await createLibp2p({
    transports: [
      memory()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    streamMuxers: [
      yamux()
    ],
    ...config,
    services: {
      ...config.services,
      echo: echo()
    }
  })

  return node
}

interface DialerAndListener {
  dialer: Libp2p<{ echo: Echo }>
  listener: Libp2p<{ echo: Echo }>
}

export async function createPeers (dialerConfig: Partial<Libp2pOptions<{ echo: Echo }>> = {}, listenerConfig: Partial<Libp2pOptions<{ echo: Echo }>> = {}): Promise<DialerAndListener> {
  return {
    dialer: await createNode(dialerConfig),
    listener: await createNode({
      ...listenerConfig,
      addresses: {
        listen: [
          '/memory/address-1'
        ]
      }
    })
  }
}
