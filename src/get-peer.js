'use strict'

const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const errCode = require('err-code')

const { codes } = require('./errors')

/**
 * @typedef {import('multiaddr')} Multiaddr
 */

/**
 * Converts the given `peer` to a `Peer` object.
 * If a multiaddr is received, the addressBook is updated.
 *
 * @param {PeerId|Multiaddr|string} peer
 * @returns {{ id: PeerId, multiaddrs: Multiaddr[]|undefined }}
 */
function getPeer (peer) {
  if (typeof peer === 'string') {
    peer = multiaddr(peer)
  }

  let addr
  if (multiaddr.isMultiaddr(peer)) {
    addr = peer
    try {
      peer = PeerId.createFromB58String(peer.getPeerId())
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
