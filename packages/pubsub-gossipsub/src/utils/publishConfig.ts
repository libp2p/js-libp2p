import { unmarshalPrivateKey } from '@libp2p/crypto/keys'
import { StrictSign, StrictNoSign } from '@libp2p/interface/pubsub'
import type { PeerId } from '@libp2p/interface/peer-id'
import { type PublishConfig, PublishConfigType } from '../types.js'

/**
 * Prepare a PublishConfig object from a PeerId.
 */
export async function getPublishConfigFromPeerId(
  signaturePolicy: typeof StrictSign | typeof StrictNoSign,
  peerId?: PeerId
): Promise<PublishConfig> {
  switch (signaturePolicy) {
    case StrictSign: {
      if (!peerId) {
        throw Error('Must provide PeerId')
      }

      if (peerId.privateKey == null) {
        throw Error('Cannot sign message, no private key present')
      }

      if (peerId.publicKey == null) {
        throw Error('Cannot sign message, no public key present')
      }

      // Transform privateKey once at initialization time instead of once per message
      const privateKey = await unmarshalPrivateKey(peerId.privateKey)

      return {
        type: PublishConfigType.Signing,
        author: peerId,
        key: peerId.publicKey,
        privateKey
      }
    }

    case StrictNoSign:
      return {
        type: PublishConfigType.Anonymous
      }

    default:
      throw new Error(`Unknown signature policy "${signaturePolicy}"`)
  }
}
