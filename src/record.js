'use strict'

const protons = require('protons')
const pb = protons(require('./record.proto')).Record
const utils = require('./utils')

class Record {
  /**
   * @param {Uint8Array} [key]
   * @param {Uint8Array} [value]
   * @param {Date} [recvtime]
   */
  constructor (key, value, recvtime) {
    if (!(key instanceof Uint8Array)) {
      throw new Error('key must be a Uint8Array')
    }

    if (!(value instanceof Uint8Array)) {
      throw new Error('value must be a Uint8Array')
    }

    this.key = key
    this.value = value
    this.timeReceived = recvtime
  }

  /**
   * @returns {Uint8Array}
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
   * @param {Uint8Array} raw
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
