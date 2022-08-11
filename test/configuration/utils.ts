import { PubSubBaseProtocol } from '@libp2p/pubsub'
import { Plaintext } from '../../src/insecure/index.js'
import { Mplex } from '@libp2p/mplex'
import { WebSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'
import mergeOptions from 'merge-options'
import type { Message, PublishResult, PubSubInit, PubSubRPC, PubSubRPCMessage } from '@libp2p/interface-pubsub'
import type { Libp2pInit, Libp2pOptions } from '../../src/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import * as cborg from 'cborg'
import { peerIdFromString } from '@libp2p/peer-id'

const relayAddr = MULTIADDRS_WEBSOCKETS[0]

export const baseOptions: Partial<Libp2pInit> = {
  peerId: peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSst'),
  transports: [new WebSockets()],
  streamMuxers: [new Mplex()],
  connectionEncryption: [new Plaintext()]
}

class MockPubSub extends PubSubBaseProtocol {
  constructor (init?: PubSubInit) {
    super({
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
      if (this.components.getPeerId().equals(id)) {
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

export const pubsubSubsystemOptions: Libp2pOptions = mergeOptions(baseOptions, {
  pubsub: new MockPubSub(),
  addresses: {
    listen: [`${relayAddr.toString()}/p2p-circuit`]
  },
  transports: [
    new WebSockets({ filter: filters.all })
  ]
})
