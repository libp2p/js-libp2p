'use strict'

const debug = require('debug')
const log = debug('libp2p:envelope')
log.error = debug('libp2p:envelope:error')
const errCode = require('err-code')

const { Buffer } = require('buffer')

const crypto = require('libp2p-crypto')
const PeerId = require('peer-id')
const varint = require('varint')

const { codes } = require('../../errors')
const Protobuf = require('./envelope.proto')

/**
 * The Envelope is responsible for keeping an arbitrary signed record
 * by a libp2p peer.
 */
class Envelope {
  /**
   * @constructor
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {Buffer} params.payloadType
   * @param {Buffer} params.payload marshaled record
   * @param {Buffer} params.signature signature of the domain string :: type hint :: payload.
   */
  constructor ({ peerId, payloadType, payload, signature }) {
    this.peerId = peerId
    this.payloadType = payloadType
    this.payload = payload
    this.signature = signature

    // Cache
    this._marshal = undefined
  }

  /**
   * Marshal the envelope content.
   * @return {Buffer}
   */
  marshal () {
    if (this._marshal) {
      return this._marshal
    }

    const publicKey = crypto.keys.marshalPublicKey(this.peerId.pubKey)

    this._marshal = Protobuf.encode({
      public_key: publicKey,
      payload_type: this.payloadType,
      payload: this.payload,
      signature: this.signature
    })

    return this._marshal
  }

  /**
   * Verifies if the other Envelope is identical to this one.
   * @param {Envelope} other
   * @return {boolean}
   */
  equals (other) {
    return this.peerId.pubKey.bytes.equals(other.peerId.pubKey.bytes) &&
      this.payloadType.equals(other.payloadType) &&
      this.payload.equals(other.payload) &&
      this.signature.equals(other.signature)
  }

  /**
   * Validate envelope data signature for the given domain.
   * @param {string} domain
   * @return {Promise<boolean>}
   */
  validate (domain) {
    const signData = formatSignaturePayload(domain, this.payloadType, this.payload)

    return this.peerId.pubKey.verify(signData, this.signature)
  }
}

/**
 * Helper function that prepares a buffer to sign or verify a signature.
 * @param {string} domain
 * @param {Buffer} payloadType
 * @param {Buffer} payload
 * @return {Buffer}
 */
const formatSignaturePayload = (domain, payloadType, payload) => {
  // When signing, a peer will prepare a buffer by concatenating the following:
  // - The length of the domain separation string string in bytes
  // - The domain separation string, encoded as UTF-8
  // - The length of the payload_type field in bytes
  // - The value of the payload_type field
  // - The length of the payload field in bytes
  // - The value of the payload field

  const domainLength = varint.encode(Buffer.byteLength(domain))
  const payloadTypeLength = varint.encode(payloadType.length)
  const payloadLength = varint.encode(payload.length)

  return Buffer.concat([
    Buffer.from(domainLength),
    Buffer.from(domain),
    Buffer.from(payloadTypeLength),
    payloadType,
    Buffer.from(payloadLength),
    payload
  ])
}

/**
 * Unmarshal a serialized Envelope protobuf message.
 * @param {Buffer} data
 * @return {Envelope}
 */
const unmarshalEnvelope = async (data) => {
  const envelopeData = Protobuf.decode(data)
  const peerId = await PeerId.createFromPubKey(envelopeData.public_key)

  return new Envelope({
    peerId,
    payloadType: envelopeData.payload_type,
    payload: envelopeData.payload,
    signature: envelopeData.signature
  })
}

/**
* Seal marshals the given Record, places the marshaled bytes inside an Envelope
* and signs it with the given peerId's private key.
* @async
* @param {Record} record
* @param {PeerId} peerId
* @return {Envelope}
*/
Envelope.seal = async (record, peerId) => {
  const domain = record.domain
  const payloadType = Buffer.from(record.codec)
  const payload = record.marshal()

  const signData = formatSignaturePayload(domain, payloadType, payload)
  const signature = await peerId.privKey.sign(signData)

  return new Envelope({
    peerId,
    payloadType,
    payload,
    signature
  })
}

/**
 * Open and certify a given marshalled envelope.
 * Data is unmarshalled and the signature validated for the given domain.
 * @param {Buffer} data
 * @param {string} domain
 * @return {Envelope}
 */
Envelope.openAndCertify = async (data, domain) => {
  const envelope = await unmarshalEnvelope(data)
  const valid = await envelope.validate(domain)

  if (!valid) {
    throw errCode(new Error('envelope signature is not valid for the given domain'), codes.ERR_SIGNATURE_NOT_VALID)
  }

  return envelope
}

module.exports = Envelope
