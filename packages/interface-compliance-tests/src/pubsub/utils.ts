import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { TypedEventEmitter } from 'main-event'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import { mockConnectionManager, mockRegistrar, mockNetwork } from '../mocks/index.js'
import type { MockNetworkComponents } from '../mocks/index.js'
import type { PeerId, PubSub, SubscriptionChangeData } from '@libp2p/interface'

export async function waitForSubscriptionUpdate (a: PubSub, b: PeerId): Promise<void> {
  await pWaitFor(async () => {
    const event = await pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(a, 'subscription-change')

    return event.detail.peerId.equals(b)
  })
}

export async function createComponents (): Promise<MockNetworkComponents> {
  const privateKey = await generateKeyPair('Ed25519')

  const components: any = {
    peerId: peerIdFromPrivateKey(privateKey),
    privateKey,
    registrar: mockRegistrar(),
    events: new TypedEventEmitter(),
    logger: defaultLogger()
  }
  components.connectionManager = mockConnectionManager(components)

  mockNetwork.addNode(components)

  return components
}
