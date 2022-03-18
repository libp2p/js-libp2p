import 'node-forge/lib/x509.js'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'

const pki = forge.pki

/**
 * Gets a self-signed X.509 certificate for the key.
 *
 * The output Uint8Array contains the PKCS #7 message in DER.
 *
 * TODO: move to libp2p-crypto package
 */
export const certificateForKey = (key: any, privateKey: forge.pki.rsa.PrivateKey) => {
  const publicKey = pki.rsa.setPublicKey(privateKey.n, privateKey.e)
  const cert = pki.createCertificate()
  cert.publicKey = publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10) // eslint-disable-line @typescript-eslint/restrict-plus-operands
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

  return cert
}

/**
 * Finds the first item in a collection that is matched in the
 * `asyncCompare` function.
 *
 * `asyncCompare` is an async function that must
 * resolve to either `true` or `false`.
 *
 * @param {Array} array
 * @param {function(*)} asyncCompare - An async function that returns a boolean
 */
export async function findAsync <T> (array: T[], asyncCompare: (val: T) => Promise<any>) {
  const promises = array.map(asyncCompare)
  const results = await Promise.all(promises)
  const index = results.findIndex(result => result)
  return array[index]
}
