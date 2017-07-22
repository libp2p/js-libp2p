/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const fixtures = require('../fixtures/secp256k1')
const crypto = require('../../src')

const mockPublicKey = {
  bytes: fixtures.pbmPublicKey
}

const mockPrivateKey = {
  bytes: fixtures.pbmPrivateKey,
  public: mockPublicKey
}

const mockSecp256k1Module = {
  generateKeyPair (bits, callback) {
    callback(null, mockPrivateKey)
  },

  unmarshalSecp256k1PrivateKey (buf, callback) {
    callback(null, mockPrivateKey)
  },

  unmarshalSecp256k1PublicKey (buf) {
    return mockPublicKey
  }
}

describe('without libp2p-crypto-secp256k1 module present', () => {
  crypto.keys.supportedKeys['secp256k1'] = undefined

  it('fails to generate a secp256k1 key', (done) => {
    crypto.keys.generateKeyPair('secp256k1', 256, (err, key) => {
      expect(err).to.exist()
      expect(key).to.not.exist()
      done()
    })
  })

  it('fails to unmarshal a secp256k1 private key', (done) => {
    crypto.keys.unmarshalPrivateKey(fixtures.pbmPrivateKey, (err, key) => {
      expect(err).to.exist()
      expect(key).to.not.exist()
      done()
    })
  })

  it('fails to unmarshal a secp256k1 public key', () => {
    expect(() => {
      crypto.keys.unmarshalPublicKey(fixtures.pbmPublicKey)
    }).to.throw(Error)
  })
})

describe('with libp2p-crypto-secp256k1 module present', () => {
  let key

  before((done) => {
    crypto.keys.supportedKeys['secp256k1'] = mockSecp256k1Module
    crypto.keys.generateKeyPair('secp256k1', 256, (err, _key) => {
      if (err) return done(err)
      key = _key
      done()
    })
  })

  after((done) => {
    delete crypto.keys['secp256k1']
    done()
  })

  it('generates a valid key', (done) => {
    expect(key).to.exist()
    done()
  })

  it('protobuf encoding', (done) => {
    const keyMarshal = crypto.keys.marshalPrivateKey(key)
    crypto.keys.unmarshalPrivateKey(keyMarshal, (err, key2) => {
      if (err) return done(err)
      const keyMarshal2 = crypto.keys.marshalPrivateKey(key2)

      expect(keyMarshal).to.eql(keyMarshal2)

      const pk = key.public
      const pkMarshal = crypto.keys.marshalPublicKey(pk)
      const pk2 = crypto.keys.unmarshalPublicKey(pkMarshal)
      const pkMarshal2 = crypto.keys.marshalPublicKey(pk2)

      expect(pkMarshal).to.eql(pkMarshal2)
      done()
    })
  })
})
