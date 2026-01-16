import { yamux } from '@chainsafe/libp2p-yamux'
import { echo } from '@libp2p/echo'
import { memory } from '@libp2p/memory'
import { plaintext } from '@libp2p/plaintext'
import { createLibp2p } from 'libp2p'
import type { Echo } from '@libp2p/echo'
import type { Libp2p, ServiceMap } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

async function createNode <Services extends ServiceMap> (config: Partial<Libp2pOptions<Services>> = {}): Promise<Libp2p<Services & { echo: Echo }>> {
  const node = await createLibp2p<Services & { echo: Echo }>({
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
    // TODO: fix this
    // @ts-expect-error can't derive types properly
    services: {
      ...config.services,
      echo: echo()
    }
  })

  return node
}

interface DialerAndListener <ListenerServices extends ServiceMap, DialerServices extends ServiceMap> {
  dialer: Libp2p<{ echo: Echo } & ListenerServices>
  listener: Libp2p<{ echo: Echo } & DialerServices>
}

export async function createPeers <ListenerServices extends ServiceMap, DialerServices extends ServiceMap> (dialerConfig: Partial<Libp2pOptions<ListenerServices>> = {}, listenerConfig: Partial<Libp2pOptions<DialerServices>> = {}): Promise<DialerAndListener<ListenerServices, DialerServices>> {
  return {
    dialer: await createNode(dialerConfig),
    listener: await createNode({
      addresses: {
        ...listenerConfig.addresses,
        listen: [...new Set(['/memory/address-1', ...(listenerConfig.addresses?.listen ?? [])])]
      },
      ...listenerConfig
    })
  }
}
