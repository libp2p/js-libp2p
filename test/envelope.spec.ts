import { expect } from 'aegir/chai'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { RecordEnvelope } from '../src/envelope/index.js'
import { codes as ErrorCodes } from '../src/errors.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { Record } from '@libp2p/interface-record'
import type { PeerId } from '@libp2p/interface-peer-id'

const domain = 'libp2p-testing'
const codec = uint8arrayFromString('/libp2p/testdata')

class TestRecord implements Record {
  public domain: string
  public codec: Uint8Array
  public data: string

  constructor (data: string) {
    this.domain = domain
    this.codec = codec
    this.data = data
  }

  marshal () {
    return uint8arrayFromString(this.data)
  }

  equals (other: Record) {
    return uint8ArrayEquals(this.marshal(), other.marshal())
  }
}

describe('Envelope', () => {
  const payloadType = codec
  let peerId: PeerId
  let testRecord: TestRecord

  before(async () => {
    peerId = await createEd25519PeerId()
    testRecord = new TestRecord('test-data')
  })

  it('creates an envelope with a random key', () => {
    const payload = testRecord.marshal()
    const signature = uint8arrayFromString(Math.random().toString(36).substring(7))

    const envelope = new RecordEnvelope({
      peerId,
      payloadType,
      payload,
      signature
    })

    expect(envelope).to.exist()
    expect(envelope.peerId.equals(peerId)).to.eql(true)
    expect(envelope.payloadType).to.equalBytes(payloadType)
    expect(envelope.payload.subarray()).to.equalBytes(payload.subarray())
    expect(envelope.signature).to.equalBytes(signature)
  })

  it('can seal a record', async () => {
    const envelope = await RecordEnvelope.seal(testRecord, peerId)
    expect(envelope).to.exist()
    expect(envelope.peerId.equals(peerId)).to.eql(true)
    expect(envelope.payloadType).to.eql(payloadType)
    expect(envelope.payload).to.exist()
    expect(envelope.signature).to.exist()
  })

  it('can open and verify a sealed record', async () => {
    const envelope = await RecordEnvelope.seal(testRecord, peerId)
    const rawEnvelope = envelope.marshal()

    const unmarshalledEnvelope = await RecordEnvelope.openAndCertify(rawEnvelope, testRecord.domain)
    expect(unmarshalledEnvelope).to.exist()

    const equals = envelope.equals(unmarshalledEnvelope)
    expect(equals).to.eql(true)
  })

  it('throw on open and verify when a different domain is used', async () => {
    const envelope = await RecordEnvelope.seal(testRecord, peerId)
    const rawEnvelope = envelope.marshal()

    await expect(RecordEnvelope.openAndCertify(rawEnvelope, '/bad-domain'))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_SIGNATURE_NOT_VALID)
  })
})
