/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const PeerId = require('peer-id')
const multihash = require('multihashes')
const crypto = require('libp2p-crypto')
const rsaUtils = require('libp2p-crypto/src/keys/rsa-utils')
const rsaClass = require('libp2p-crypto/src/keys/rsa-class')

const sample = {
  id: '122019318b6e5e0cf93a2314bf01269a2cc23cd3dcd452d742cdb9379d8646f6e4a9',
  privKey: 'CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw==',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAE='
}

describe('peer ID', () => {
  let peer
  let publicKeyDer // a buffer

  before(function (done) {
    const encoded = Buffer.from(sample.privKey, 'base64')
    PeerId.createFromPrivKey(encoded, (err, id) => {
      expect(err).to.not.exist()
      peer = id
      done()
    })
  })

  it('decoded public key', (done) => {
    // console.log('peer id', peer.toJSON())
    // console.log('id', peer.toB58String())
    // console.log('id decoded', multihash.decode(peer.id))

    // get protobuf version of the public key
    const publicKeyProtobuf = peer.marshalPubKey()
    const publicKey = crypto.keys.unmarshalPublicKey(publicKeyProtobuf)
    // console.log('public key', publicKey)
    publicKeyDer = publicKey.marshal()
    // console.log('public key der', publicKeyDer.toString('base64'))

    // get protobuf version of the private key
    const privateKeyProtobuf = peer.marshalPrivKey()
    crypto.keys.unmarshalPrivateKey(privateKeyProtobuf, (err, key) => {
      expect(err).to.not.exist()
      // console.log('private key', key)
      // console.log('\nprivate key der', key.marshal().toString('base64'))
      done()
    })
  })

  it('encoded public key with DER', (done) => {
    const jwk = rsaUtils.pkixToJwk(publicKeyDer)
    // console.log('jwk', jwk)
    const rsa = new rsaClass.RsaPublicKey(jwk)
    // console.log('rsa', rsa)
    rsa.hash((err, keyId) => {
      expect(err).to.not.exist()
      // console.log('err', err)
      // console.log('keyId', keyId)
      // console.log('id decoded', multihash.decode(keyId))
      const kids = multihash.toB58String(keyId)
      // console.log('id', kids)
      expect(kids).to.equal(peer.toB58String())
      done()
    })
  })

  it('encoded public key with JWT', (done) => {
    const jwk = {
      kty: 'RSA',
      n: 'tkiqPxzBWXgZpdQBd14o868a30F3Sc43jwWQG3caikdTHOo7kR14o-h12D45QJNNQYRdUty5eC8ItHAB4YIH-Oe7DIOeVFsnhinlL9LnILwqQcJUeXENNtItDIM4z1ji1qta7b0mzXAItmRFZ-vkNhHB6N8FL1kbS3is_g2UmX8NjxAwvgxjyT5e3_IO85eemMpppsx_ZYmSza84P6onaJFL-btaXRq3KS7jzXkzg5NHKigfjlG7io_RkoWBAghI2smyQ5fdu-qGpS_YIQbUnhL9tJLoGrU72MufdMBZSZJL8pfpz8SB9BBGDCivV0VpbvV2J6En26IsHL_DN0pbIw',
      e: 'AQAB',
      alg: 'RS256',
      kid: '2011-04-29'
    }
    // console.log('jwk', jwk)
    const rsa = new rsaClass.RsaPublicKey(jwk)
    // console.log('rsa', rsa)
    rsa.hash((err, keyId) => {
      expect(err).to.not.exist()
      // console.log('err', err)
      // console.log('keyId', keyId)
      // console.log('id decoded', multihash.decode(keyId))
      const kids = multihash.toB58String(keyId)
      // console.log('id', kids)
      expect(kids).to.equal(peer.toB58String())
      done()
    })
  })

  it('decoded private key', (done) => {
    // console.log('peer id', peer.toJSON())
    // console.log('id', peer.toB58String())
    // console.log('id decoded', multihash.decode(peer.id))

    // get protobuf version of the private key
    const privateKeyProtobuf = peer.marshalPrivKey()
    crypto.keys.unmarshalPrivateKey(privateKeyProtobuf, (err, key) => {
      expect(err).to.not.exist()
      // console.log('private key', key)
      // console.log('\nprivate key der', key.marshal().toString('base64'))
      done()
    })
  })
})
