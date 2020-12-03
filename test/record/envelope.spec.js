'use strict'
/* eslint-env mocha */

const { chai, expect } = require('aegir/utils/chai')
chai.use(require('chai-bytes'))
const uint8arrayFromString = require('uint8arrays/from-string')
const uint8arrayEquals = require('uint8arrays/equals')
const Envelope = require('../../src/record/envelope')
const { codes: ErrorCodes } = require('../../src/errors')

const peerUtils = require('../utils/creators/peer')

const domain = 'libp2p-testing'
const codec = uint8arrayFromString('/libp2p/testdata')

class TestRecord {
  constructor (data) {
    this.domain = domain
    this.codec = codec
    this.data = data
  }

  marshal () {
    return uint8arrayFromString(this.data)
  }

  equals (other) {
    return uint8arrayEquals(this.data, other.data)
  }
}

describe('Envelope', () => {
  const payloadType = codec
  let peerId
  let testRecord

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
    testRecord = new TestRecord('test-data')
  })

  it('creates an envelope with a random key', () => {
    const payload = testRecord.marshal()
    const signature = uint8arrayFromString(Math.random().toString(36).substring(7))

    const envelope = new Envelope({
      peerId,
      payloadType,
      payload,
      signature
    })

    expect(envelope).to.exist()
    expect(envelope.peerId.equals(peerId)).to.eql(true)
    expect(envelope.payloadType).to.equalBytes(payloadType)
    expect(envelope.payload).to.equalBytes(payload)
    expect(envelope.signature).to.equalBytes(signature)
  })

  it('can seal a record', async () => {
    const envelope = await Envelope.seal(testRecord, peerId)
    expect(envelope).to.exist()
    expect(envelope.peerId.equals(peerId)).to.eql(true)
    expect(envelope.payloadType).to.eql(payloadType)
    expect(envelope.payload).to.exist()
    expect(envelope.signature).to.exist()
  })

  it('can open and verify a sealed record', async () => {
    const envelope = await Envelope.seal(testRecord, peerId)
    const rawEnvelope = envelope.marshal()

    const unmarshalledEnvelope = await Envelope.openAndCertify(rawEnvelope, testRecord.domain)
    expect(unmarshalledEnvelope).to.exist()

    const equals = envelope.equals(unmarshalledEnvelope)
    expect(equals).to.eql(true)
  })

  it('throw on open and verify when a different domain is used', async () => {
    const envelope = await Envelope.seal(testRecord, peerId)
    const rawEnvelope = envelope.marshal()

    await expect(Envelope.openAndCertify(rawEnvelope, '/bad-domain'))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_SIGNATURE_NOT_VALID)
  })
})
