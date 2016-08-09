'use strict'

const SecureSession = require('libp2p-secio').SecureSession

exports = module.exports

exports.create = (local, insecure) => {
  const session = new SecureSession(local, local.privKey, insecure)
  return session.secure
}
