'use strict'

const protons = require('protons')
const { Buffer } = require('buffer')
const pb = protons(require('./record.proto')).Record
const utils = require('./utils')

class Record {
  /**
   * @param {Buffer} [key]
   * @param {Buffer} [value]
   * @param {Date} [recvtime]
   */
  constructor (key, value, recvtime) {
    if (key && !Buffer.isBuffer(key)) {
      throw new Error('key must be a Buffer')
    }

    if (value && !Buffer.isBuffer(value)) {
      throw new Error('value must be a buffer')
    }

    this.key = key
    this.value = value
    this.timeReceived = recvtime
  }

  /**
   * @returns {Buffer}
   */
  serialize () {
    return pb.encode(this.prepareSerialize())
  }

  /**
   * Return the object format ready to be given to the protobuf library.
   *
   * @returns {Object}
   */
  prepareSerialize () {
    return {
      key: this.key,
      value: this.value,
      timeReceived: this.timeReceived && utils.toRFC3339(this.timeReceived)
    }
  }

  /**
   * Decode a protobuf encoded record.
   *
   * @param {Buffer} raw
   * @returns {Record}
   */
  static deserialize (raw) {
    const dec = pb.decode(raw)
    return Record.fromDeserialized(dec)
  }

  /**
   * Create a record from the raw object returned from the protobuf library.
   *
   * @param {Object} obj
   * @returns {Record}
   */
  static fromDeserialized (obj) {
    let recvtime
    if (obj.timeReceived) {
      recvtime = utils.parseRFC3339(obj.timeReceived)
    }

    const rec = new Record(
      obj.key, obj.value, recvtime
    )

    return rec
  }
}

module.exports = Record
