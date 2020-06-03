'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-bytes'))
const { expect } = chai

const multicodec = require('multicodec')

const Envelope = require('../../src/record-manager/envelope')
const Record = require('libp2p-interfaces/src/record')

const peerUtils = require('../utils/creators/peer')

const domain = '/test-domain'

class TestRecord extends Record {
  constructor (data) {
    super(domain, multicodec.LIBP2P_PEER_RECORD)
    this.data = data
  }

  marshal () {
    return Buffer.from(this.data)
  }

  isEqual (other) {
    return Buffer.compare(this.data, other.data)
  }
}

describe('Envelope', () => {
  const payloadType = Buffer.from(`${multicodec.print[multicodec.LIBP2P_PEER_RECORD]}${domain}`)
  let peerId
  let testRecord

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
    testRecord = new TestRecord('test-data')
  })

  it('creates an envelope with a random key', () => {
    const payload = testRecord.marshal()
    const signature = Buffer.from(Math.random().toString(36).substring(7))

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
    expect(envelope.payloadType).to.equalBytes(payloadType)
    expect(envelope.payload).to.exist()
    expect(envelope.signature).to.exist()
  })

  it('can open and verify a sealed record', async () => {
    const envelope = await Envelope.seal(testRecord, peerId)
    const rawEnvelope = envelope.marshal()

    const unmarshalledEnvelope = await Envelope.openAndCertify(rawEnvelope, testRecord.domain)
    expect(unmarshalledEnvelope).to.exist()

    const isEqual = envelope.isEqual(unmarshalledEnvelope)
    expect(isEqual).to.eql(true)
  })

  it.skip('throw on open and verify when a different domain is used', async () => {
    const envelope = await Envelope.seal(testRecord, peerId)
    const rawEnvelope = envelope.marshal()

    await expect(Envelope.openAndCertify(rawEnvelope, '/fake-domain'))
      .to.eventually.rejected()
  })
})
