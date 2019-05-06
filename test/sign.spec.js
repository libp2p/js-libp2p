/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const { Message } = require('../src/message')
const { signMessage, SignPrefix } = require('../src/message/sign')
const PeerId = require('peer-id')
const { randomSeqno } = require('../src/utils')

describe('message signing', () => {
  let peerId
  before((done) => {
    peerId = PeerId.create({
      bits: 1024
    }, (err, id) => {
      peerId = id
      done(err)
    })
  })

  it('should be able to sign a message', (done) => {
    const message = {
      from: 'QmABC',
      data: 'hello',
      seqno: randomSeqno(),
      topicIDs: ['test-topic']
    }

    const bytesToSign = Buffer.concat([SignPrefix, Message.encode(message)])

    peerId.privKey.sign(bytesToSign, (err, expectedSignature) => {
      if (err) return done(err)

      signMessage(peerId, message, (err, signedMessage) => {
        if (err) return done(err)

        // Check the signature and public key
        expect(signedMessage.signature).to.eql(expectedSignature)
        expect(signedMessage.key).to.eql(peerId.pubKey.bytes)

        // Verify the signature
        peerId.pubKey.verify(bytesToSign, signedMessage.signature, (err, verified) => {
          expect(verified).to.eql(true)
          done(err)
        })
      })
    })
  })
})
