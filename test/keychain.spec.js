/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const expect = chai.expect
const fail = expect.fail
chai.use(require('dirty-chai'))
chai.use(require('chai-string'))
const Keychain = require('../')
const PeerId = require('peer-id')
const promisify = require('promisify-es6')

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
      it('is a valid filename and non-ASCII', async () => {
        const errors = await Promise.all([
          ks.removeKey('../../nasty').then(fail, err => err),
          ks.removeKey('').then(fail, err => err),
          ks.removeKey('    ').then(fail, err => err),
          ks.removeKey(null).then(fail, err => err),
          ks.removeKey(undefined).then(fail, err => err)
        ])

        expect(errors).to.have.length(5)
        errors.forEach(error => {
          expect(error).to.have.property('code', 'ERR_INVALID_KEY_NAME')
        })
      })
    })

    describe('key', () => {
      it('can be an RSA key', async () => {
        rsaKeyInfo = await ks.createKey(rsaKeyName, 'rsa', 2048)
        expect(rsaKeyInfo).to.exist()
        expect(rsaKeyInfo).to.have.property('name', rsaKeyName)
        expect(rsaKeyInfo).to.have.property('id')
      })

      it('is encrypted PEM encoded PKCS #8', async () => {
        const pem = await ks._getPrivateKey(rsaKeyName)
        return expect(pem).to.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')
      })

      it('throws if an invalid private key name is given', async () => {
        const err = await ks._getPrivateKey(undefined).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
      })

      it('throws if a private key cant be found', async () => {
        const err = await ks._getPrivateKey('not real').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_KEY_NOT_FOUND')
      })

      it('does not overwrite existing key', async () => {
        const err = await ks.createKey(rsaKeyName, 'rsa', 2048).then(fail, err => err)
        expect(err).to.have.property('code', 'ERR_KEY_ALREADY_EXISTS')
      })

      it('cannot create the "self" key', async () => {
        const err = await ks.createKey('self', 'rsa', 2048).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
      })

      it('should validate name is string', async () => {
        const err = await ks.createKey(5, 'rsa', 2048).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
      })

      it('should validate type is string', async () => {
        const err = await ks.createKey('TEST' + Date.now(), null, 2048).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_TYPE')
      })

      it('should validate size is integer', async () => {
        const err = await ks.createKey('TEST' + Date.now(), 'rsa', 'string').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_SIZE')
      })

      describe('implements NIST SP 800-131A', () => {
        it('disallows RSA length < 2048', async () => {
          const err = await ks.createKey('bad-nist-rsa', 'rsa', 1024).then(fail, err => err)
          expect(err).to.exist()
          expect(err).to.have.property('code', 'ERR_INVALID_KEY_SIZE')
        })
      })
    })

    describe('query', () => {
      it('finds all existing keys', async () => {
        const keys = await ks.listKeys()
        expect(keys).to.exist()
        const mykey = keys.find((k) => k.name.normalize() === rsaKeyName.normalize())
        expect(mykey).to.exist()
      })

      it('finds a key by name', async () => {
        const key = await ks.findKeyByName(rsaKeyName)
        expect(key).to.exist()
        expect(key).to.deep.equal(rsaKeyInfo)
      })

      it('finds a key by id', async () => {
        const key = await ks.findKeyById(rsaKeyInfo.id)
        expect(key).to.exist()
        expect(key).to.deep.equal(rsaKeyInfo)
      })

      it('returns the key\'s name and id', async () => {
        const keys = await ks.listKeys()
        expect(keys).to.exist()
        keys.forEach((key) => {
          expect(key).to.have.property('name')
          expect(key).to.have.property('id')
        })
      })
    })

    describe('CMS protected data', () => {
      const plainData = Buffer.from('This is a message from Alice to Bob')
      let cms

      it('service is available', () => {
        expect(ks).to.have.property('cms')
      })

      it('requires a key', async () => {
        const err = await ks.cms.encrypt('no-key', plainData).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_KEY_NOT_FOUND')
      })

      it('requires plain data as a Buffer', async () => {
        const err = await ks.cms.encrypt(rsaKeyName, 'plain data').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_PARAMS')
      })

      it('encrypts', async () => {
        cms = await ks.cms.encrypt(rsaKeyName, plainData)
        expect(cms).to.exist()
        expect(cms).to.be.instanceOf(Buffer)
      })

      it('is a PKCS #7 message', async () => {
        const err = await ks.cms.decrypt('not CMS').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_PARAMS')
      })

      it('is a PKCS #7 binary message', async () => {
        const err = await ks.cms.decrypt(plainData).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_CMS')
      })

      it('cannot be read without the key', async () => {
        const err = await emptyKeystore.cms.decrypt(cms).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('missingKeys')
        expect(err.missingKeys).to.eql([rsaKeyInfo.id])
        expect(err).to.have.property('code', 'ERR_MISSING_KEYS')
      })

      it('can be read with the key', async () => {
        const plain = await ks.cms.decrypt(cms)
        expect(plain).to.exist()
        expect(plain.toString()).to.equal(plainData.toString())
      })
    })

    describe('exported key', () => {
      let pemKey

      it('requires the password', async () => {
        const err = await ks.exportKey(rsaKeyName).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_PASSWORD_REQUIRED')
      })

      it('requires the key name', async () => {
        const err = await ks.exportKey(undefined, 'password').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
      })

      it('is a PKCS #8 encrypted pem', async () => {
        pemKey = await ks.exportKey(rsaKeyName, 'password')
        expect(pemKey).to.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')
      })

      it('can be imported', async () => {
        const key = await ks.importKey('imported-key', pemKey, 'password')
        expect(key.name).to.equal('imported-key')
        expect(key.id).to.equal(rsaKeyInfo.id)
      })

      it('requires the pem', async () => {
        const err = await ks.importKey('imported-key', undefined, 'password').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_PEM_REQUIRED')
      })

      it('cannot be imported as an existing key name', async () => {
        const err = await ks.importKey(rsaKeyName, pemKey, 'password').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_KEY_ALREADY_EXISTS')
      })

      it('cannot be imported with the wrong password', async () => {
        const err = await ks.importKey('a-new-name-for-import', pemKey, 'not the password').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_CANNOT_READ_KEY')
      })
    })

    describe('peer id', () => {
      const alicePrivKey = 'CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw=='
      let alice

      before(async function () {
        const encoded = Buffer.from(alicePrivKey, 'base64')
        alice = await promisify(PeerId.createFromPrivKey)(encoded)
      })

      it('private key can be imported', async () => {
        const key = await ks.importPeer('alice', alice)
        expect(key.name).to.equal('alice')
        expect(key.id).to.equal(alice.toB58String())
      })

      it('private key import requires a valid name', async () => {
        const err = await ks.importPeer(undefined, alice).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
      })

      it('private key import requires the peer', async () => {
        const err = await ks.importPeer('alice').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_MISSING_PRIVATE_KEY')
      })

      it('key id exists', async () => {
        const key = await ks.findKeyById(alice.toB58String())
        expect(key).to.exist()
        expect(key).to.have.property('name', 'alice')
        expect(key).to.have.property('id', alice.toB58String())
      })

      it('key name exists', async () => {
        const key = await ks.findKeyByName('alice')
        expect(key).to.exist()
        expect(key).to.have.property('name', 'alice')
        expect(key).to.have.property('id', alice.toB58String())
      })
    })

    describe('rename', () => {
      it('requires an existing key name', async () => {
        const err = await ks.renameKey('not-there', renamedRsaKeyName).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_NOT_FOUND')
      })

      it('requires a valid new key name', async () => {
        const err = await ks.renameKey(rsaKeyName, '..\not-valid').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_NEW_KEY_NAME_INVALID')
      })

      it('does not overwrite existing key', async () => {
        const err = await ks.renameKey(rsaKeyName, rsaKeyName).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_KEY_ALREADY_EXISTS')
      })

      it('cannot create the "self" key', async () => {
        const err = await ks.renameKey(rsaKeyName, 'self').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_NEW_KEY_NAME_INVALID')
      })

      it('removes the existing key name', async () => {
        const key = await ks.renameKey(rsaKeyName, renamedRsaKeyName)
        expect(key).to.exist()
        expect(key).to.have.property('name', renamedRsaKeyName)
        expect(key).to.have.property('id', rsaKeyInfo.id)
        // Try to find the changed key
        const err = await ks.findKeyByName(rsaKeyName).then(fail, err => err)
        expect(err).to.exist()
      })

      it('creates the new key name', async () => {
        const key = await ks.findKeyByName(renamedRsaKeyName)
        expect(key).to.exist()
        expect(key).to.have.property('name', renamedRsaKeyName)
      })

      it('does not change the key ID', async () => {
        const key = await ks.findKeyByName(renamedRsaKeyName)
        expect(key).to.exist()
        expect(key).to.have.property('name', renamedRsaKeyName)
        expect(key).to.have.property('id', rsaKeyInfo.id)
      })

      it('throws with invalid key names', async () => {
        const err = await ks.findKeyByName(undefined).then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
      })
    })

    describe('key removal', () => {
      it('cannot remove the "self" key', async () => {
        const err = await ks.removeKey('self').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_INVALID_KEY_NAME')
      })

      it('cannot remove an unknown key', async () => {
        const err = await ks.removeKey('not-there').then(fail, err => err)
        expect(err).to.exist()
        expect(err).to.have.property('code', 'ERR_KEY_NOT_FOUND')
      })

      it('can remove a known key', async () => {
        const key = await ks.removeKey(renamedRsaKeyName)
        expect(key).to.exist()
        expect(key).to.have.property('name', renamedRsaKeyName)
        expect(key).to.have.property('id', rsaKeyInfo.id)
      })
    })
  })
}
