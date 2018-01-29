'use strict'

const forge = require('node-forge')
const pki = forge.pki
exports = module.exports

/**
 * Gets a self-signed X.509 certificate for the key.
 *
 * The output Buffer contains the PKCS #7 message in DER.
 *
 * TODO: move to libp2p-crypto package
 *
 * @param {KeyInfo} key - The id and name of the key
 * @param {RsaPrivateKey} privateKey - The naked key
 * @param {function(Error, Certificate)} callback
 * @returns {undefined}
 */
exports.certificateForKey = (key, privateKey, callback) => {
  const publicKey = pki.setRsaPublicKey(privateKey.n, privateKey.e)
  const cert = pki.createCertificate()
  cert.publicKey = publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10)
  const attrs = [{
    name: 'organizationName',
    value: 'ipfs'
  }, {
    shortName: 'OU',
    value: 'keystore'
  }, {
    name: 'commonName',
    value: key.id
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
}
