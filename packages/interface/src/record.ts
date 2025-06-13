import type { PublicKey } from './keys.js'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * Record is the base implementation of a record that can be used as the payload of a libp2p envelope.
 */
export interface Record {
  /**
   * signature domain.
   */
  domain: string
  /**
   * identifier of the type of record
   */
  codec: Uint8Array
  /**
   * Marshal a record to be used in an envelope.
   */
  marshal(): Uint8Array
  /**
   * Verifies if the other provided Record is identical to this one.
   */
  equals(other: Record): boolean
}

/**
 * A message with a signed payload.
 */
export interface Envelope {
  /**
   * The public key of the keypair used to sign the payload
   */
  publicKey: PublicKey

  /**
   * How the payload should be interpreted
   */
  payloadType: Uint8Array | Uint8ArrayList

  /**
   * The contents of the envelope
   */
  payload: Uint8Array

  /**
   * A signature that can be used to verify the payload is intact
   */
  signature: Uint8Array | Uint8ArrayList

  /**
   * Serialize the envelope to a binary format
   */
  marshal(): Uint8Array

  /**
   * Use the public key to validate that the payload is intact
   */
  validate(domain: string): Promise<boolean>

  /**
   * Returns true if this envelope has equivalency with the passed object
   */
  equals(other?: Envelope): boolean
}
