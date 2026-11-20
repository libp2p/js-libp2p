import { StrictSign, StrictNoSign } from '../index.ts'
import { PublishConfigType } from '../types.ts'
import type { PublishConfig } from '../types.ts'
import type { PeerId, PrivateKey } from '@libp2p/interface'

/**
 * Prepare a PublishConfig object from a PeerId.
 */
export function getPublishConfigFromPeerId (
  signaturePolicy: typeof StrictSign | typeof StrictNoSign,
  peerId: PeerId,
  privateKey: PrivateKey
): PublishConfig {
  switch (signaturePolicy) {
    case StrictSign: {
      return {
        type: PublishConfigType.Signing,
        author: peerId,
        key: privateKey.publicKey.toProtobuf(),
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
