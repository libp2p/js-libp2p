/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Buffer = require('safe-buffer').Buffer

const libp2pCrypto = require('libp2p-crypto')
const keysPBM = libp2pCrypto.keys.keysPBM
const randomBytes = libp2pCrypto.randomBytes
const crypto = require('../src/crypto')(randomBytes)

describe('secp256k1 keys', () => {
  let key
  const secp256k1 = require('../src')(keysPBM, randomBytes)

  before((done) => {
    secp256k1.generateKeyPair((err, _key) => {
      expect(err).to.not.exist()
      key = _key
      done()
    })
  })

  it('generates a valid key', (done) => {
    expect(key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
    expect(key.public).to.be.an.instanceof(secp256k1.Secp256k1PublicKey)

    key.hash((err, digest) => {
      expect(err).to.not.exist()
      expect(digest).to.have.length(34)

      key.public.hash((err, digest) => {
        expect(err).to.not.exist()
        expect(digest).to.have.length(34)
        done()
      })
    })
  })

  it('optionally accepts a `bits` argument when generating a key', (done) => {
    secp256k1.generateKeyPair(256, (err, _key) => {
      expect(err).to.not.exist()
      expect(_key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
      done()
    })
  })

  it('requires a callback to generate a key', () => {
    expect(() => secp256k1.generateKeyPair()).to.throw()
  })

  it('signs', (done) => {
    const text = randomBytes(512)

    key.sign(text, (err, sig) => {
      expect(err).to.not.exist()

      key.public.verify(text, sig, (err, res) => {
        expect(err).to.not.exist()
        expect(res).to.equal(true)
        done()
      })
    })
  })

  it('encoding', (done) => {
    const keyMarshal = key.marshal()
    secp256k1.unmarshalSecp256k1PrivateKey(keyMarshal, (err, key2) => {
      expect(err).to.not.exist()
      const keyMarshal2 = key2.marshal()

      expect(keyMarshal).to.eql(keyMarshal2)

      const pk = key.public
      const pkMarshal = pk.marshal()
      const pk2 = secp256k1.unmarshalSecp256k1PublicKey(pkMarshal)
      const pkMarshal2 = pk2.marshal()

      expect(pkMarshal).to.eql(pkMarshal2)
      done()
    })
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.eql(true)

      expect(key.public.equals(key.public)).to.eql(true)
    })

    it('not equals other key', (done) => {
      secp256k1.generateKeyPair(256, (err, key2) => {
        expect(err).to.not.exist()

        expect(key.equals(key2)).to.eql(false)
        expect(key2.equals(key)).to.eql(false)
        expect(key.public.equals(key2.public)).to.eql(false)
        expect(key2.public.equals(key.public)).to.eql(false)
        done()
      })
    })
  })

  it('sign and verify', (done) => {
    const data = Buffer.from('hello world')
    key.sign(data, (err, sig) => {
      expect(err).to.not.exist()

      key.public.verify(data, sig, (err, valid) => {
        expect(err).to.not.exist()
        expect(valid).to.eql(true)
        done()
      })
    })
  })

  it('fails to verify for different data', (done) => {
    const data = Buffer.from('hello world')
    key.sign(data, (err, sig) => {
      expect(err).to.not.exist()

      key.public.verify(Buffer.from('hello'), sig, (err, valid) => {
        expect(err).to.not.exist()
        expect(valid).to.eql(false)
        done()
      })
    })
  })
})

describe('key generation error', () => {
  let generateKey
  let secp256k1

  before((done) => {
    generateKey = crypto.generateKey
    crypto.generateKey = (callback) => callback(new Error('Error generating key'))
    secp256k1 = require('../src')(keysPBM, randomBytes, crypto)

    done()
  })

  after((done) => {
    crypto.generateKey = generateKey
    done()
  })

  it('returns an error if key generation fails', (done) => {
    secp256k1.generateKeyPair((err, key) => {
      expect(err).to.exist()
      expect(key).to.not.exist()
      done()
    })
  })
})

describe('handles generation of invalid key', () => {
  let generateKey
  let secp256k1

  before((done) => {
    generateKey = crypto.generateKey
    crypto.generateKey = (callback) => { callback(null, Buffer.from('not a real key')) }
    secp256k1 = require('../src')(keysPBM, randomBytes, crypto)

    done()
  })

  after((done) => {
    crypto.generateKey = generateKey
    done()
  })

  it('returns an error if key generator returns an invalid key', (done) => {
    secp256k1.generateKeyPair((err, key) => {
      expect(err).to.exist()
      expect(key).to.not.exist()
      done()
    })
  })
})

describe('crypto functions', () => {
  let privKey
  let pubKey

  before((done) => {
    crypto.generateKey((err, _key) => {
      expect(err).to.not.exist()
      privKey = _key
      pubKey = crypto.computePublicKey(privKey)
      done()
    })
  })

  it('generates valid keys', (done) => {
    expect(() => {
      crypto.validatePrivateKey(privKey)
      crypto.validatePublicKey(pubKey)
    }).to.not.throw()
    done()
  })

  it('does not validate an invalid key', (done) => {
    expect(() => crypto.validatePublicKey(Buffer.from('42'))).to.throw()
    expect(() => crypto.validatePrivateKey(Buffer.from('42'))).to.throw()
    done()
  })

  it('validates a correct signature', (done) => {
    crypto.hashAndSign(privKey, Buffer.from('hello'), (err, sig) => {
      expect(err).to.not.exist()
      crypto.hashAndVerify(pubKey, sig, Buffer.from('hello'), (err, valid) => {
        expect(err).to.not.exist()
        expect(valid).to.equal(true)
        done()
      })
    })
  })

  it('errors if given a null buffer to sign', (done) => {
    crypto.hashAndSign(privKey, null, (err, sig) => {
      expect(err).to.exist()
      expect(sig).to.not.exist()
      done()
    })
  })

  it('errors when signing with an invalid key', (done) => {
    crypto.hashAndSign(Buffer.from('42'), Buffer.from('Hello'), (err, sig) => {
      expect(err).to.exist()
      expect(sig).to.not.exist()
      done()
    })
  })

  it('errors if given a null buffer to validate', (done) => {
    crypto.hashAndSign(privKey, Buffer.from('hello'), (err, sig) => {
      expect(err).to.not.exist()

      crypto.hashAndVerify(privKey, sig, null, (err, valid) => {
        expect(err).to.exist()
        expect(valid).to.not.exist()
        done()
      })
    })
  })

  it('errors when validating a message with an invalid signature', (done) => {
    crypto.hashAndVerify(pubKey, Buffer.from('invalid-sig'), Buffer.from('hello'), (err, valid) => {
      expect(err).to.exist()
      expect(valid).to.not.exist()
      done()
    })
  })

  it('errors when signing with an invalid key', (done) => {
    crypto.hashAndSign(Buffer.from('42'), Buffer.from('Hello'), (err, sig) => {
      expect(err).to.exist()
      expect(sig).to.not.exist()
      done()
    })
  })

  it('throws when compressing an invalid public key', (done) => {
    expect(() => crypto.compressPublicKey(Buffer.from('42'))).to.throw()
    done()
  })

  it('throws when decompressing an invalid public key', (done) => {
    expect(() => crypto.decompressPublicKey(Buffer.from('42'))).to.throw()
    done()
  })

  it('compresses/decompresses a valid public key', (done) => {
    const decompressed = crypto.decompressPublicKey(pubKey)
    expect(decompressed).to.exist()
    expect(decompressed.length).to.be.eql(65)
    const recompressed = crypto.compressPublicKey(decompressed)
    expect(recompressed).to.eql(pubKey)
    done()
  })
})

describe('go interop', () => {
  const secp256k1 = require('../src')(keysPBM, randomBytes)
  const fixtures = require('./fixtures/go-interop')

  it('loads a private key marshaled by go-libp2p-crypto', (done) => {
    // we need to first extract the key data from the protobuf, which is
    // normally handled by js-libp2p-crypto
    const decoded = keysPBM.PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.eql(keysPBM.KeyType.Secp256k1)

    secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data, (err, key) => {
      expect(err).to.not.exist()

      expect(key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
      expect(key.bytes).to.eql(fixtures.privateKey)
      done()
    })
  })

  it('loads a public key marshaled by go-libp2p-crypto', (done) => {
    const decoded = keysPBM.PublicKey.decode(fixtures.publicKey)
    expect(decoded.Type).to.be.eql(keysPBM.KeyType.Secp256k1)

    const key = secp256k1.unmarshalSecp256k1PublicKey(decoded.Data)
    expect(key).to.be.an.instanceof(secp256k1.Secp256k1PublicKey)
    expect(key.bytes).to.eql(fixtures.publicKey)
    done()
  })

  it('generates the same signature as go-libp2p-crypto', (done) => {
    const decoded = keysPBM.PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.eql(keysPBM.KeyType.Secp256k1)

    secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data, (err, key) => {
      expect(err).to.not.exist()

      key.sign(fixtures.message, (err, sig) => {
        expect(err).to.not.exist()
        expect(sig).to.eql(fixtures.signature)
        done()
      })
    })
  })
})
