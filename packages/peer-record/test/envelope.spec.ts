import { generateKeyPair } from '@libp2p/crypto/keys'
import { expect } from 'aegir/chai'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { RecordEnvelope } from '../src/envelope/index.js'
import type { PrivateKey, Record } from '@libp2p/interface'

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

  marshal (): Uint8Array {
    return uint8arrayFromString(this.data)
  }

  equals (other: Record): boolean {
    return uint8ArrayEquals(this.marshal(), other.marshal())
  }
}

describe('Envelope', () => {
  const payloadType = codec
  let key: PrivateKey
  let testRecord: TestRecord

  before(async () => {
    key = await generateKeyPair('Ed25519')
    testRecord = new TestRecord('test-data')
  })

  it('creates an envelope with a random key', () => {
    const payload = testRecord.marshal()
    const signature = uint8arrayFromString(Math.random().toString(36).substring(7))

    const envelope = new RecordEnvelope({
      publicKey: key.publicKey,
      payloadType,
      payload,
      signature
    })

    expect(envelope).to.exist()
    expect(envelope.publicKey.equals(key.publicKey)).to.eql(true)
    expect(envelope.payloadType).to.equalBytes(payloadType)
    expect(envelope.payload.subarray()).to.equalBytes(payload.subarray())
    expect(envelope.signature).to.equalBytes(signature)
  })

  it('can seal a record', async () => {
    const envelope = await RecordEnvelope.seal(testRecord, key)
    expect(envelope).to.exist()
    expect(envelope.publicKey.equals(key.publicKey)).to.eql(true)
    expect(envelope.payloadType).to.eql(payloadType)
    expect(envelope.payload).to.exist()
    expect(envelope.signature).to.exist()
  })

  it('can open and verify a sealed record', async () => {
    const envelope = await RecordEnvelope.seal(testRecord, key)
    const rawEnvelope = envelope.marshal()

    const unmarshaledEnvelope = await RecordEnvelope.openAndCertify(rawEnvelope, testRecord.domain)
    expect(unmarshaledEnvelope).to.exist()

    const equals = envelope.equals(unmarshaledEnvelope)
    expect(equals).to.eql(true)
  })

  it('throw on open and verify when a different domain is used', async () => {
    const envelope = await RecordEnvelope.seal(testRecord, key)
    const rawEnvelope = envelope.marshal()

    await expect(RecordEnvelope.openAndCertify(rawEnvelope, '/bad-domain'))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'InvalidSignatureError')
  })
})
