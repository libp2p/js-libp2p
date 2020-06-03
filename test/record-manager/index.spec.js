'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const { Buffer } = require('buffer')
const multiaddr = require('multiaddr')

const Envelope = require('../../src/record-manager/envelope')
const RecordManager = require('../../src/record-manager')

const peerUtils = require('../utils/creators/peer')

describe('Record manager', () => {
  let peerId
  let recordManager

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  beforeEach(() => {
    recordManager = new RecordManager({
      peerId,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/2000'),
        multiaddr('/ip4/127.0.0.1/tcp/2001')
      ]
    })
  })

  it('needs to start to create a signed peer record', async () => {
    let envelope = recordManager.getPeerRecordEnvelope()
    expect(envelope).to.not.exist()

    await recordManager.start()
    envelope = recordManager.getPeerRecordEnvelope()
    expect(envelope).to.exist()
  })

  it('can marshal the created signed peer record envelope', async () => {
    await recordManager.start()
    const envelope = recordManager.getPeerRecordEnvelope()

    expect(envelope).to.exist()
    expect(peerId.equals(envelope.peerId)).to.eql(true)
    expect(envelope.payload).to.exist()
    expect(envelope.signature).to.exist()

    const marshledEnvelope = envelope.marshal()
    expect(marshledEnvelope).to.exist()
    expect(Buffer.isBuffer(marshledEnvelope)).to.eql(true)

    const decodedEnvelope = await Envelope.openAndCertify(marshledEnvelope, 'domain') // TODO: domain
    expect(decodedEnvelope).to.exist()

    const isEqual = envelope.isEqual(decodedEnvelope)
    expect(isEqual).to.eql(true)
  })
  // TODO: test signature validation?
})
