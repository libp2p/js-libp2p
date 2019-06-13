/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
chai.use(require('chai-string'))
const Keychain = require('..')
const PeerId = require('peer-id')

module.exports = (datastore1, datastore2) => {
  describe('keychain', () => {
    const passPhrase = 'this is not a secure phrase'
    const rsaKeyName = 'tajné jméno'
    const renamedRsaKeyName = 'ชื่อลับ'
    let rsaKeyInfo
    let emptyKeystore
    let ks

    before((done) => {
      ks = new Keychain(datastore2, { passPhrase: passPhrase })
      emptyKeystore = new Keychain(datastore1, { passPhrase: passPhrase })
      done()
    })

    it('needs a pass phrase to encrypt a key', () => {
      expect(() => new Keychain(datastore2)).to.throw()
    })

    it('needs a NIST SP 800-132 non-weak pass phrase', () => {
      expect(() => new Keychain(datastore2, { passPhrase: '< 20 character' })).to.throw()
    })

    it('needs a store to persist a key', () => {
      expect(() => new Keychain(null, { passPhrase: passPhrase })).to.throw()
    })

    it('has default options', () => {
      expect(Keychain.options).to.exist()
    })

    it('needs a supported hashing alorithm', () => {
      const ok = new Keychain(datastore2, { passPhrase: passPhrase, dek: { hash: 'sha2-256' } })
      expect(ok).to.exist()
      expect(() => new Keychain(datastore2, { passPhrase: passPhrase, dek: { hash: 'my-hash' } })).to.throw()
    })

    it('can generate options', () => {
      const options = Keychain.generateOptions()
      options.passPhrase = passPhrase
      const chain = new Keychain(datastore2, options)
      expect(chain).to.exist()
    })

    describe('key name', () => {
      it('is a valid filename and non-ASCII', () => {
        ks.removeKey('../../nasty', (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('message', 'Invalid key name \'../../nasty\'')
          expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
        })
        ks.removeKey('', (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('message', 'Invalid key name \'\'')
          expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
        })
        ks.removeKey('    ', (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('message', 'Invalid key name \'    \'')
          expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
        })
        ks.removeKey(null, (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('message', 'Invalid key name \'null\'')
          expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
        })
        ks.removeKey(undefined, (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('message', 'Invalid key name \'undefined\'')
          expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
        })
      })
    })

    describe('key', () => {
      it('can be an RSA key', function (done) {
        this.timeout(50 * 1000)
        ks.createKey(rsaKeyName, 'rsa', 2048, (err, info) => {
          expect(err).to.not.exist()
          expect(info).exist()
          rsaKeyInfo = info
          done()
        })
      })

      it('has a name and id', () => {
        expect(rsaKeyInfo).to.have.property('name', rsaKeyName)
        expect(rsaKeyInfo).to.have.property('id')
      })

      it('is encrypted PEM encoded PKCS #8', (done) => {
        ks._getPrivateKey(rsaKeyName, (err, pem) => {
          expect(err).to.not.exist()
          expect(pem).to.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')
          done()
        })
      })

      it('does not overwrite existing key', (done) => {
        ks.createKey(rsaKeyName, 'rsa', 2048, (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_KEY_ALREADY_EXISTS')
          done()
        })
      })

      it('cannot create the "self" key', (done) => {
        ks.createKey('self', 'rsa', 2048, (err) => {
          expect(err).to.exist()
          done()
        })
      })

      it('should validate name is string', (done) => {
        ks.createKey(5, 'rsa', 2048, (err) => {
          expect(err).to.exist()
          expect(err.message).to.contain('Invalid key name')
          done()
        })
      })

      it('should validate type is string', (done) => {
        ks.createKey('TEST' + Date.now(), null, 2048, (err) => {
          expect(err).to.exist()
          expect(err.message).to.contain('Invalid key type')
          done()
        })
      })

      it('should validate size is integer', (done) => {
        ks.createKey('TEST' + Date.now(), 'rsa', 'string', (err) => {
          expect(err).to.exist()
          expect(err.message).to.contain('Invalid key size')
          done()
        })
      })

      describe('implements NIST SP 800-131A', () => {
        it('disallows RSA length < 2048', (done) => {
          ks.createKey('bad-nist-rsa', 'rsa', 1024, (err) => {
            expect(err).to.exist()
            expect(err).to.have.property('message', 'Invalid RSA key size 1024')
            expect(err).to.have.property('code', 'ERR_INVALID_KEY_SIZE')
            done()
          })
        })
      })
    })

    describe('query', () => {
      it('finds all existing keys', (done) => {
        ks.listKeys((err, keys) => {
          expect(err).to.not.exist()
          expect(keys).to.exist()
          const mykey = keys.find((k) => k.name.normalize() === rsaKeyName.normalize())
          expect(mykey).to.exist()
          done()
        })
      })

      it('finds a key by name', (done) => {
        ks.findKeyByName(rsaKeyName, (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.deep.equal(rsaKeyInfo)
          done()
        })
      })

      it('finds a key by id', (done) => {
        ks.findKeyById(rsaKeyInfo.id, (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.deep.equal(rsaKeyInfo)
          done()
        })
      })

      it('returns the key\'s name and id', (done) => {
        ks.listKeys((err, keys) => {
          expect(err).to.not.exist()
          expect(keys).to.exist()
          keys.forEach((key) => {
            expect(key).to.have.property('name')
            expect(key).to.have.property('id')
          })
          done()
        })
      })
    })

    describe('CMS protected data', () => {
      const plainData = Buffer.from('This is a message from Alice to Bob')
      let cms

      it('service is available', (done) => {
        expect(ks).to.have.property('cms')
        done()
      })

      it('requires a key', (done) => {
        ks.cms.encrypt('no-key', plainData, (err, msg) => {
          expect(err).to.exist()
          done()
        })
      })

      it('requires plain data as a Buffer', (done) => {
        ks.cms.encrypt(rsaKeyName, 'plain data', (err, msg) => {
          expect(err).to.exist()
          done()
        })
      })

      it('encrypts', (done) => {
        ks.cms.encrypt(rsaKeyName, plainData, (err, msg) => {
          expect(err).to.not.exist()
          expect(msg).to.exist()
          expect(msg).to.be.instanceOf(Buffer)
          cms = msg
          done()
        })
      })

      it('is a PKCS #7 message', (done) => {
        ks.cms.decrypt('not CMS', (err) => {
          expect(err).to.exist()
          done()
        })
      })

      it('is a PKCS #7 binary message', (done) => {
        ks.cms.decrypt(plainData, (err) => {
          expect(err).to.exist()
          done()
        })
      })

      it('cannot be read without the key', (done) => {
        emptyKeystore.cms.decrypt(cms, (err, plain) => {
          expect(err).to.exist()
          expect(err).to.have.property('missingKeys')
          expect(err.missingKeys).to.eql([rsaKeyInfo.id])
          expect(err).to.have.property('code', 'ERR_MISSING_KEYS')
          done()
        })
      })

      it('can be read with the key', (done) => {
        ks.cms.decrypt(cms, (err, plain) => {
          expect(err).to.not.exist()
          expect(plain).to.exist()
          expect(plain.toString()).to.equal(plainData.toString())
          done()
        })
      })
    })

    describe('exported key', () => {
      let pemKey

      it('is a PKCS #8 encrypted pem', (done) => {
        ks.exportKey(rsaKeyName, 'password', (err, pem) => {
          expect(err).to.not.exist()
          expect(pem).to.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')
          pemKey = pem
          done()
        })
      })

      it('can be imported', (done) => {
        ks.importKey('imported-key', pemKey, 'password', (err, key) => {
          expect(err).to.not.exist()
          expect(key.name).to.equal('imported-key')
          expect(key.id).to.equal(rsaKeyInfo.id)
          done()
        })
      })

      it('cannot be imported as an existing key name', (done) => {
        ks.importKey(rsaKeyName, pemKey, 'password', (err, key) => {
          expect(err).to.exist()
          done()
        })
      })

      it('cannot be imported with the wrong password', function (done) {
        this.timeout(5 * 1000)
        ks.importKey('a-new-name-for-import', pemKey, 'not the password', (err, key) => {
          expect(err).to.exist()
          done()
        })
      })
    })

    describe('peer id', () => {
      const alicePrivKey = 'CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw=='
      let alice

      before(function (done) {
        const encoded = Buffer.from(alicePrivKey, 'base64')
        PeerId.createFromPrivKey(encoded, (err, id) => {
          expect(err).to.not.exist()
          alice = id
          done()
        })
      })

      it('private key can be imported', (done) => {
        ks.importPeer('alice', alice, (err, key) => {
          expect(err).to.not.exist()
          expect(key.name).to.equal('alice')
          expect(key.id).to.equal(alice.toB58String())
          done()
        })
      })

      it('key id exists', (done) => {
        ks.findKeyById(alice.toB58String(), (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.have.property('name', 'alice')
          expect(key).to.have.property('id', alice.toB58String())
          done()
        })
      })

      it('key name exists', (done) => {
        ks.findKeyByName('alice', (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.have.property('name', 'alice')
          expect(key).to.have.property('id', alice.toB58String())
          done()
        })
      })
    })

    describe('rename', () => {
      it('requires an existing key name', (done) => {
        ks.renameKey('not-there', renamedRsaKeyName, (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_KEY_NOT_FOUND')
          done()
        })
      })

      it('requires a valid new key name', (done) => {
        ks.renameKey(rsaKeyName, '..\not-valid', (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_NEW_KEY_NAME_INVALID')
          done()
        })
      })

      it('does not overwrite existing key', (done) => {
        ks.renameKey(rsaKeyName, rsaKeyName, (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_KEY_ALREADY_EXISTS')
          done()
        })
      })

      it('cannot create the "self" key', (done) => {
        ks.renameKey(rsaKeyName, 'self', (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_NEW_KEY_NAME_INVALID')
          done()
        })
      })

      it('removes the existing key name', (done) => {
        ks.renameKey(rsaKeyName, renamedRsaKeyName, (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.have.property('name', renamedRsaKeyName)
          expect(key).to.have.property('id', rsaKeyInfo.id)
          ks.findKeyByName(rsaKeyName, (err, key) => {
            expect(err).to.exist()
            done()
          })
        })
      })

      it('creates the new key name', (done) => {
        ks.findKeyByName(renamedRsaKeyName, (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.have.property('name', renamedRsaKeyName)
          done()
        })
      })

      it('does not change the key ID', (done) => {
        ks.findKeyByName(renamedRsaKeyName, (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.have.property('name', renamedRsaKeyName)
          expect(key).to.have.property('id', rsaKeyInfo.id)
          done()
        })
      })
    })

    describe('key removal', () => {
      it('cannot remove the "self" key', (done) => {
        ks.removeKey('self', (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
          done()
        })
      })

      it('cannot remove an unknown key', (done) => {
        ks.removeKey('not-there', (err) => {
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_KEY_NOT_FOUND')
          done()
        })
      })

      it('can remove a known key', (done) => {
        ks.removeKey(renamedRsaKeyName, (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.exist()
          expect(key).to.have.property('name', renamedRsaKeyName)
          expect(key).to.have.property('id', rsaKeyInfo.id)
          done()
        })
      })
    })
  })
}
