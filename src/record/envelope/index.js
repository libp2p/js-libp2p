'use strict'

const errCode = require('err-code')
const uint8arraysConcat = require('uint8arrays/concat')
const uint8arraysFromString = require('uint8arrays/from-string')
// @ts-ignore libp2p-crypto does not support types
const cryptoKeys = require('libp2p-crypto/src/keys')
const PeerId = require('peer-id')
const varint = require('varint')
const uint8arraysEquals = require('uint8arrays/equals')

const { codes } = require('../../errors')
const { Envelope: Protobuf } = require('./envelope')

/**
 * @typedef {import('libp2p-interfaces/src/record/types').Record} Record
 */

class Envelope {
  /**
   * The Envelope is responsible for keeping an arbitrary signed record
   * by a libp2p peer.
   *
   * @class
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {Uint8Array} params.payloadType
   * @param {Uint8Array} params.payload - marshaled record
   * @param {Uint8Array} params.signature - signature of the domain string :: type hint :: payload.
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
   *
   * @returns {Uint8Array}
   */
  marshal () {
    if (this._marshal) {
      return this._marshal
    }

    const publicKey = cryptoKeys.marshalPublicKey(this.peerId.pubKey)

    this._marshal = Protobuf.encode({
      publicKey: publicKey,
      payloadType: this.payloadType,
      payload: this.payload,
      signature: this.signature
    }).finish()

    return this._marshal
  }

  /**
   * Verifies if the other Envelope is identical to this one.
   *
   * @param {Envelope} other
   * @returns {boolean}
   */
  equals (other) {
    return uint8arraysEquals(this.peerId.pubKey.bytes, other.peerId.pubKey.bytes) &&
      uint8arraysEquals(this.payloadType, other.payloadType) &&
      uint8arraysEquals(this.payload, other.payload) &&
      uint8arraysEquals(this.signature, other.signature)
  }

  /**
   * Validate envelope data signature for the given domain.
   *
   * @param {string} domain
   * @returns {Promise<boolean>}
   */
  validate (domain) {
    const signData = formatSignaturePayload(domain, this.payloadType, this.payload)

    return this.peerId.pubKey.verify(signData, this.signature)
  }
}

/**
 * Helper function that prepares a Uint8Array to sign or verify a signature.
 *
 * @param {string} domain
 * @param {Uint8Array} payloadType
 * @param {Uint8Array} payload
 * @returns {Uint8Array}
 */
const formatSignaturePayload = (domain, payloadType, payload) => {
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

/**
 * Unmarshal a serialized Envelope protobuf message.
 *
 * @param {Uint8Array} data
 * @returns {Promise<Envelope>}
 */
Envelope.createFromProtobuf = async (data) => {
  const envelopeData = Protobuf.decode(data)
  const peerId = await PeerId.createFromPubKey(envelopeData.publicKey)

  return new Envelope({
    peerId,
    payloadType: envelopeData.payloadType,
    payload: envelopeData.payload,
    signature: envelopeData.signature
  })
}

/**
 * Seal marshals the given Record, places the marshaled bytes inside an Envelope
 * and signs it with the given peerId's private key.
 *
 * @async
 * @param {Record} record
 * @param {PeerId} peerId
 * @returns {Promise<Envelope>}
 */
Envelope.seal = async (record, peerId) => {
  const domain = record.domain
  const payloadType = record.codec
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
 *
 * @param {Uint8Array} data
 * @param {string} domain
 * @returns {Promise<Envelope>}
 */
Envelope.openAndCertify = async (data, domain) => {
  const envelope = await Envelope.createFromProtobuf(data)
  const valid = await envelope.validate(domain)

  if (!valid) {
    throw errCode(new Error('envelope signature is not valid for the given domain'), codes.ERR_SIGNATURE_NOT_VALID)
  }

  return envelope
}

module.exports = Envelope
