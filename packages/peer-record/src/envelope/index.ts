import { publicKeyFromProtobuf, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import * as varint from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8arraysFromString } from 'uint8arrays/from-string'
import { Envelope as Protobuf } from './envelope.js'
import { InvalidSignatureError } from './errors.js'
import type { Record, Envelope, PrivateKey, PublicKey } from '@libp2p/interface'
import type { AbortOptions } from '@multiformats/multiaddr'

export interface RecordEnvelopeInit {
  publicKey: PublicKey
  payloadType: Uint8Array
  payload: Uint8Array
  signature: Uint8Array
}

export class RecordEnvelope implements Envelope {
  /**
   * Unmarshal a serialized Envelope protobuf message
   */
  static createFromProtobuf = (data: Uint8Array | Uint8ArrayList): RecordEnvelope => {
    const envelopeData = Protobuf.decode(data)
    const publicKey = publicKeyFromProtobuf(envelopeData.publicKey)

    return new RecordEnvelope({
      publicKey,
      payloadType: envelopeData.payloadType,
      payload: envelopeData.payload,
      signature: envelopeData.signature
    })
  }

  /**
   * Seal marshals the given Record, places the marshaled bytes inside an Envelope
   * and signs it with the given peerId's private key
   */
  static seal = async (record: Record, privateKey: PrivateKey, options?: AbortOptions): Promise<RecordEnvelope> => {
    if (privateKey == null) {
      throw new Error('Missing private key')
    }

    const domain = record.domain
    const payloadType = record.codec
    const payload = record.marshal()
    const signData = formatSignaturePayload(domain, payloadType, payload)
    const signature = await privateKey.sign(signData.subarray(), options)

    return new RecordEnvelope({
      publicKey: privateKey.publicKey,
      payloadType,
      payload,
      signature
    })
  }

  /**
   * Open and certify a given marshaled envelope.
   * Data is unmarshaled and the signature validated for the given domain.
   */
  static openAndCertify = async (data: Uint8Array | Uint8ArrayList, domain: string, options?: AbortOptions): Promise<RecordEnvelope> => {
    const envelope = RecordEnvelope.createFromProtobuf(data)
    const valid = await envelope.validate(domain, options)

    if (!valid) {
      throw new InvalidSignatureError('Envelope signature is not valid for the given domain')
    }

    return envelope
  }

  public publicKey: PublicKey
  public payloadType: Uint8Array
  public payload: Uint8Array
  public signature: Uint8Array
  public marshaled?: Uint8Array

  /**
   * The Envelope is responsible for keeping an arbitrary signed record
   * by a libp2p peer.
   */
  constructor (init: RecordEnvelopeInit) {
    const { publicKey, payloadType, payload, signature } = init

    this.publicKey = publicKey
    this.payloadType = payloadType
    this.payload = payload
    this.signature = signature
  }

  /**
   * Marshal the envelope content
   */
  marshal (): Uint8Array {
    if (this.marshaled == null) {
      this.marshaled = Protobuf.encode({
        publicKey: publicKeyToProtobuf(this.publicKey),
        payloadType: this.payloadType,
        payload: this.payload.subarray(),
        signature: this.signature
      })
    }

    return this.marshaled
  }

  /**
   * Verifies if the other Envelope is identical to this one
   */
  equals (other?: Envelope): boolean {
    if (other == null) {
      return false
    }

    return uint8ArrayEquals(this.marshal(), other.marshal())
  }

  /**
   * Validate envelope data signature for the given domain
   */
  async validate (domain: string, options?: AbortOptions): Promise<boolean> {
    const signData = formatSignaturePayload(domain, this.payloadType, this.payload)

    return this.publicKey.verify(signData.subarray(), this.signature, options)
  }
}

/**
 * Helper function that prepares a Uint8Array to sign or verify a signature
 */
const formatSignaturePayload = (domain: string, payloadType: Uint8Array, payload: Uint8Array | Uint8ArrayList): Uint8ArrayList => {
  // When signing, a peer will prepare a Uint8Array by concatenating the following:
  // - The length of the domain separation string string in bytes
  // - The domain separation string, encoded as UTF-8
  // - The length of the payload_type field in bytes
  // - The value of the payload_type field
  // - The length of the payload field in bytes
  // - The value of the payload field

  const domainUint8Array = uint8arraysFromString(domain)
  const domainLength = varint.encode(domainUint8Array.byteLength)
  const payloadTypeLength = varint.encode(payloadType.length)
  const payloadLength = varint.encode(payload.length)

  return new Uint8ArrayList(
    domainLength,
    domainUint8Array,
    payloadTypeLength,
    payloadType,
    payloadLength,
    payload
  )
}
