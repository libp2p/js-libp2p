import { mockConnectionManager, mockRegistrar, mockNetwork } from '@libp2p/interface-mocks'
import { EventEmitter } from '@libp2p/interfaces/events'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import type { MockNetworkComponents } from '@libp2p/interface-mocks'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PubSub, SubscriptionChangeData } from '@libp2p/interface-pubsub'

export async function waitForSubscriptionUpdate (a: PubSub, b: PeerId): Promise<void> {
  await pWaitFor(async () => {
    const event = await pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(a, 'subscription-change')

    return event.detail.peerId.equals(b)
  })
}

export async function createComponents (): Promise<MockNetworkComponents> {
  const components: any = {
    peerId: await createEd25519PeerId(),
    registrar: mockRegistrar(),
    events: new EventEmitter()
  }
  components.connectionManager = mockConnectionManager(components)

  mockNetwork.addNode(components)

  return components
}
