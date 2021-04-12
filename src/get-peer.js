'use strict'

const PeerId = require('peer-id')
const { Multiaddr } = require('multiaddr')
const errCode = require('err-code')

const { codes } = require('./errors')

/**
 * Converts the given `peer` to a `Peer` object.
 * If a multiaddr is received, the addressBook is updated.
 *
 * @param {PeerId|Multiaddr|string} peer
 * @returns {{ id: PeerId, multiaddrs: Multiaddr[]|undefined }}
 */
function getPeer (peer) {
  if (typeof peer === 'string') {
    peer = new Multiaddr(peer)
  }

  let addr
  if (Multiaddr.isMultiaddr(peer)) {
    addr = peer
    const idStr = peer.getPeerId()

    if (!idStr) {
      throw errCode(
        new Error(`${peer} does not have a valid peer type`),
        codes.ERR_INVALID_MULTIADDR
      )
    }

    try {
      peer = PeerId.createFromB58String(idStr)
    } catch (err) {
      throw errCode(
        new Error(`${peer} is not a valid peer type`),
        codes.ERR_INVALID_MULTIADDR
      )
    }
  }

  return {
    id: peer,
    multiaddrs: addr ? [addr] : undefined
  }
}

module.exports = getPeer
