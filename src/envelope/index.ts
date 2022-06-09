import errCode from 'err-code'
import { concat as uint8arraysConcat } from 'uint8arrays/concat'
import { fromString as uint8arraysFromString } from 'uint8arrays/from-string'
import { unmarshalPrivateKey, unmarshalPublicKey } from '@libp2p/crypto/keys'
import varint from 'varint'
import { equals as uint8arraysEquals } from 'uint8arrays/equals'
import { codes } from '../errors.js'
import { Envelope as Protobuf } from './envelope.js'
import { peerIdFromKeys } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Record, Envelope } from '@libp2p/interfaces/record'

export interface EnvelopeInit {
  peerId: PeerId
  payloadType: Uint8Array
  payload: Uint8Array
  signature: Uint8Array
}

export class RecordEnvelope implements Envelope {
  /**
   * Unmarshal a serialized Envelope protobuf message
   */
  static createFromProtobuf = async (data: Uint8Array) => {
    const envelopeData = Protobuf.decode(data)
    const peerId = await peerIdFromKeys(envelopeData.publicKey)

    return new RecordEnvelope({
      peerId,
      payloadType: envelopeData.payloadType,
      payload: envelopeData.payload,
      signature: envelopeData.signature
    })
  }

  /**
   * Seal marshals the given Record, places the marshaled bytes inside an Envelope
   * and signs it with the given peerId's private key
   */
  static seal = async (record: Record, peerId: PeerId) => {
    const domain = record.domain
    const payloadType = record.codec
    const payload = record.marshal()

    const signData = formatSignaturePayload(domain, payloadType, payload)

    if (peerId.privateKey == null) {
      throw new Error('Missing private key')
    }

    const key = await unmarshalPrivateKey(peerId.privateKey)
    const signature = await key.sign(signData)

    return new RecordEnvelope({
      peerId,
      payloadType,
      payload,
      signature
    })
  }

  /**
   * Open and certify a given marshalled envelope.
   * Data is unmarshalled and the signature validated for the given domain.
   */
  static openAndCertify = async (data: Uint8Array, domain: string) => {
    const envelope = await RecordEnvelope.createFromProtobuf(data)
    const valid = await envelope.validate(domain)

    if (!valid) {
      throw errCode(new Error('envelope signature is not valid for the given domain'), codes.ERR_SIGNATURE_NOT_VALID)
    }

    return envelope
  }

  public peerId: PeerId
  public payloadType: Uint8Array
  public payload: Uint8Array
  public signature: Uint8Array
  public marshaled?: Uint8Array

  /**
   * The Envelope is responsible for keeping an arbitrary signed record
   * by a libp2p peer.
   */
  constructor (init: EnvelopeInit) {
    const { peerId, payloadType, payload, signature } = init

    this.peerId = peerId
    this.payloadType = payloadType
    this.payload = payload
    this.signature = signature
  }

  /**
   * Marshal the envelope content
   */
  marshal () {
    if (this.peerId.publicKey == null) {
      throw new Error('Missing public key')
    }

    if (this.marshaled == null) {
      this.marshaled = Protobuf.encode({
        publicKey: this.peerId.publicKey,
        payloadType: this.payloadType,
        payload: this.payload,
        signature: this.signature
      })
    }

    return this.marshaled
  }

  /**
   * Verifies if the other Envelope is identical to this one
   */
  equals (other: Envelope) {
    return uint8arraysEquals(this.marshal(), other.marshal())
  }

  /**
   * Validate envelope data signature for the given domain
   */
  async validate (domain: string) {
    const signData = formatSignaturePayload(domain, this.payloadType, this.payload)

    if (this.peerId.publicKey == null) {
      throw new Error('Missing public key')
    }

    const key = unmarshalPublicKey(this.peerId.publicKey)

    return await key.verify(signData, this.signature)
  }
}

/**
 * Helper function that prepares a Uint8Array to sign or verify a signature
 */
const formatSignaturePayload = (domain: string, payloadType: Uint8Array, payload: Uint8Array) => {
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

  return uint8arraysConcat([
    new Uint8Array(domainLength),
    domainUint8Array,
    new Uint8Array(payloadTypeLength),
    payloadType,
    new Uint8Array(payloadLength),
    payload
  ])
}
