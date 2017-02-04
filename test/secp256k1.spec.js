/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const fixtures = require('./fixtures/secp256k1')
const crypto = require('../src')

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

describe('with libp2p-crypto-secp256k1 module present', () => {
  let key

  before((done) => {
    crypto.keys['secp256k1'] = mockSecp256k1Module
    crypto.generateKeyPair('secp256k1', 256, (err, _key) => {
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
    expect(
      key
    ).to.exist
    done()
  })

  it('protobuf encoding', (done) => {
    const keyMarshal = crypto.marshalPrivateKey(key)
    crypto.unmarshalPrivateKey(keyMarshal, (err, key2) => {
      if (err) return done(err)
      const keyMarshal2 = crypto.marshalPrivateKey(key2)

      expect(
        keyMarshal
      ).to.be.eql(
        keyMarshal2
      )

      const pk = key.public
      const pkMarshal = crypto.marshalPublicKey(pk)
      const pk2 = crypto.unmarshalPublicKey(pkMarshal)
      const pkMarshal2 = crypto.marshalPublicKey(pk2)

      expect(
        pkMarshal
      ).to.be.eql(
        pkMarshal2
      )
      done()
    })
  })
})

describe('without libp2p-crypto-secp256k1 module present', () => {
  it('fails to generate a secp256k1 key', (done) => {
    crypto.generateKeyPair('secp256k1', 256, (err, key) => {
      expect(err).to.exist
      expect(key).to.not.exist
      done()
    })
  })

  it('fails to unmarshal a secp256k1 private key', (done) => {
    crypto.unmarshalPrivateKey(fixtures.pbmPrivateKey, (err, key) => {
      expect(err).to.exist
      expect(key).to.not.exist
      done()
    })
  })

  it('fails to unmarshal a secp256k1 public key', () => {
    expect(() => {
      crypto.unmarshalPublicKey(fixtures.pbmPublicKey)
    }).to.throw(Error)
  })
})
