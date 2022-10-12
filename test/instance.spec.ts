import { expect } from 'aegir/chai'
import { PubSubBaseProtocol } from '../src/index.js'
import type { PublishResult, PubSubRPC, PubSubRPCMessage } from '@libp2p/interface-pubsub'
import type { Uint8ArrayList } from 'uint8arraylist'
import { MockRegistrar } from './utils/index.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

class PubsubProtocol extends PubSubBaseProtocol {
  decodeRpc (bytes: Uint8Array): PubSubRPC {
    throw new Error('Method not implemented.')
  }

  encodeRpc (rpc: PubSubRPC): Uint8Array {
    throw new Error('Method not implemented.')
  }

  decodeMessage (bytes: Uint8Array | Uint8ArrayList): PubSubRPCMessage {
    throw new Error('Method not implemented.')
  }

  encodeMessage (rpc: PubSubRPCMessage): Uint8Array {
    throw new Error('Method not implemented.')
  }

  async publishMessage (): Promise<PublishResult> {
    throw new Error('Method not implemented.')
  }
}

describe('pubsub instance', () => {
  it('should throw if no init is provided', () => {
    expect(() => {
      // @ts-expect-error incorrect constructor args
      new PubsubProtocol() // eslint-disable-line no-new
    }).to.throw()
  })

  it('should accept valid parameters', async () => {
    const peerId = await createEd25519PeerId()

    expect(() => {
      return new PubsubProtocol({
        peerId,
        registrar: new MockRegistrar()
      }, { // eslint-disable-line no-new
        multicodecs: ['/pubsub/1.0.0']
      })
    }).not.to.throw()
  })
})
