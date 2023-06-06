import { yamux } from '@chainsafe/libp2p-yamux'
import { mockConnectionGater } from '@libp2p/interface-mocks'
import { PubSubBaseProtocol, type PubSubComponents } from '@libp2p/pubsub'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { multiaddr } from '@multiformats/multiaddr'
import * as cborg from 'cborg'
import mergeOptions from 'merge-options'
import { circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { plaintext } from '../../src/insecure/index.js'
import type { Libp2pInit, Libp2pOptions } from '../../src/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Message, PublishResult, PubSub, PubSubInit, PubSubRPC, PubSubRPCMessage } from '@libp2p/interface-pubsub'

const relayAddr = multiaddr(process.env.RELAY_MULTIADDR)

export const baseOptions: Partial<Libp2pInit<{ pubsub: PubSub }>> = {
  addresses: {
    listen: [
      `${relayAddr}/p2p-circuit`
    ]
  },
  transports: [
    webSockets({
      filter: filters.all
    }),
    circuitRelayTransport()
  ],
  streamMuxers: [yamux()],
  connectionEncryption: [plaintext()]
}

class MockPubSub extends PubSubBaseProtocol {
  constructor (components: PubSubComponents, init?: PubSubInit) {
    super(components, {
      multicodecs: ['/mock-pubsub'],
      ...init
    })
  }

  decodeRpc (bytes: Uint8Array): PubSubRPC {
    return cborg.decode(bytes)
  }

  encodeRpc (rpc: PubSubRPC): Uint8Array {
    return cborg.encode(rpc)
  }

  decodeMessage (bytes: Uint8Array): PubSubRPCMessage {
    return cborg.decode(bytes)
  }

  encodeMessage (rpc: PubSubRPCMessage): Uint8Array {
    return cborg.encode(rpc)
  }

  async publishMessage (from: PeerId, message: Message): Promise<PublishResult> {
    const peers = this.getSubscribers(message.topic)
    const recipients: PeerId[] = []

    if (peers == null || peers.length === 0) {
      return { recipients }
    }

    peers.forEach(id => {
      if (this.components.peerId.equals(id)) {
        return
      }

      if (id.equals(from)) {
        return
      }

      recipients.push(id)
      this.send(id, { messages: [message] })
    })

    return { recipients }
  }
}

export const pubsubSubsystemOptions: Libp2pOptions<{ pubsub: PubSub }> = mergeOptions(baseOptions, {
  addresses: {
    listen: [`${relayAddr.toString()}/p2p-circuit`]
  },
  transports: [
    webSockets({ filter: filters.all }),
    circuitRelayTransport()
  ],
  services: {
    pubsub: (components: PubSubComponents) => new MockPubSub(components)
  },
  connectionGater: mockConnectionGater()
})
