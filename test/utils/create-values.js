'use strict'

const multihashing = require('multihashing-async')
const CID = require('cids')
const crypto = require('libp2p-crypto')

function createValues (length) {
  return Promise.all(
    Array.from({ length }).map(async () => {
      const bytes = crypto.randomBytes(32)
      const h = await multihashing(bytes, 'sha2-256')
      return {
        cid: new CID(h),
        value: bytes
      }
    })
  )
}

module.exports = createValues
