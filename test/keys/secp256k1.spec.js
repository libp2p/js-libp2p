/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const sinon = require('sinon')

const fixtures = require('../fixtures/secp256k1')
const crypto = require('../../src')

describe('without libp2p-crypto-secp256k1 module present', () => {
  before(() => {
    sinon.replace(crypto.keys.supportedKeys, 'secp256k1', null)
  })

  after(() => {
    sinon.restore()
  })

  it('fails to generate a secp256k1 key', async () => {
    try {
      await crypto.keys.generateKeyPair('secp256k1', 256)
    } catch (err) {
      return // expected
    }
    throw new Error('Expected error to be thrown')
  })

  it('fails to unmarshal a secp256k1 private key', async () => {
    try {
      await crypto.keys.unmarshalPrivateKey(fixtures.pbmPrivateKey)
    } catch (err) {
      return // expected
    }
    throw new Error('Expected error to be thrown')
  })

  it('fails to unmarshal a secp256k1 public key', () => {
    expect(() => {
      crypto.keys.unmarshalPublicKey(fixtures.pbmPublicKey)
    }).to.throw(Error)
  })
})

describe('with libp2p-crypto-secp256k1 module present', () => {
  it('generates a valid key', async () => {
    const key = await crypto.keys.generateKeyPair('secp256k1', 256)
    expect(key).to.exist()
  })

  it('protobuf encoding', async () => {
    const key = await crypto.keys.generateKeyPair('secp256k1', 256)
    expect(key).to.exist()

    const keyMarshal = crypto.keys.marshalPrivateKey(key)
    const key2 = await crypto.keys.unmarshalPrivateKey(keyMarshal)
    const keyMarshal2 = crypto.keys.marshalPrivateKey(key2)

    expect(keyMarshal).to.eql(keyMarshal2)

    const pk = key.public
    const pkMarshal = crypto.keys.marshalPublicKey(pk)
    const pk2 = crypto.keys.unmarshalPublicKey(pkMarshal)
    const pkMarshal2 = crypto.keys.marshalPublicKey(pk2)

    expect(pkMarshal).to.eql(pkMarshal2)
  })

  it('unmarshals a secp256k1 private key', async () => {
    const key = await crypto.keys.unmarshalPrivateKey(fixtures.pbmPrivateKey)
    expect(key).to.exist()
  })

  it('unmarshals a secp256k1 public key', () => {
    const key = crypto.keys.unmarshalPublicKey(fixtures.pbmPublicKey)
    expect(key).to.exist()
  })
})
