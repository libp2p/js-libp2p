'use strict'

const forge = require('node-forge')
const pki = forge.pki
const multihash = require('multihashes')
const rsaUtils = require('libp2p-crypto/src/keys/rsa-utils')
const rsaClass = require('libp2p-crypto/src/keys/rsa-class')

exports = module.exports

// Create an IPFS key id; the SHA-256 multihash of a public key.
// See https://github.com/richardschneider/ipfs-encryption/issues/16
exports.keyId = (privateKey, callback) => {
  try {
    const publicKey = pki.setRsaPublicKey(privateKey.n, privateKey.e)
    const spki = pki.publicKeyToSubjectPublicKeyInfo(publicKey)
    const der = Buffer.from(forge.asn1.toDer(spki).getBytes(), 'binary')
    const jwk = rsaUtils.pkixToJwk(der)
    const rsa = new rsaClass.RsaPublicKey(jwk)
    rsa.hash((err, kid) => {
      if (err) return callback(err)

      const kids = multihash.toB58String(kid)
      return callback(null, kids)
    })
  } catch (err) {
    callback(err)
  }
}

exports.certificateForKey = (privateKey, callback) => {
  exports.keyId(privateKey, (err, kid) => {
    if (err) return callback(err)

    const publicKey = pki.setRsaPublicKey(privateKey.n, privateKey.e)
    const cert = pki.createCertificate()
    cert.publicKey = publicKey
    cert.serialNumber = '01'
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10)
    var attrs = [{
      name: 'organizationName',
      value: 'ipfs'
    }, {
      shortName: 'OU',
      value: 'keystore'
    }, {
      name: 'commonName',
      value: kid
    }]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    }, {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true
    }])
    // self-sign certificate
    cert.sign(privateKey)

    return callback(null, cert)
  })
}
