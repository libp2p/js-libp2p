/* eslint-env mocha */

import { echo } from '@libp2p/echo'
import { memory } from '@libp2p/memory'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.js'
import type { Components } from '../../src/components.js'
import type { Libp2pOptions } from '../../src/index.js'
import type { Echo } from '@libp2p/echo'
import type { Libp2p } from '@libp2p/interface'

async function createNode (config: Partial<Libp2pOptions<{ echo: Echo }>> = {}): Promise<{ node: Libp2p<{ echo: Echo }>, components: Components }> {
  let components: Components = stubInterface<Components>()

  const node = await createLibp2p({
    transports: [
      memory()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    streamMuxers: [
      mplex()
    ],
    ...config,
    services: {
      echo: echo(),
      components: (c) => {
        components = c
      }
    }
  })

  return {
    node,
    components
  }
}

interface DialerAndListener {
  dialer: Libp2p<{ echo: Echo }>
  dialerComponents: Components

  listener: Libp2p<{ echo: Echo }>
  listenerComponents: Components
}

export async function createPeers (dialerConfig: Partial<Libp2pOptions<{ echo: Echo }>> = {}, listenerConfig: Partial<Libp2pOptions<{ echo: Echo }>> = {}): Promise<DialerAndListener> {
  const { node: dialer, components: dialerComponents } = await createNode(dialerConfig)
  const { node: listener, components: listenerComponents } = await createNode({
    ...listenerConfig,
    addresses: {
      listen: [
        '/memory/address-1'
      ]
    }
  })

  return {
    dialer,
    dialerComponents,

    listener,
    listenerComponents
  }
}
