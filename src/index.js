'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')
const includes = require('lodash/includes')
const setImmediate = require('async/setImmediate')

const log = debug('libp2p:railing')
log.error = debug('libp2p:railing:error')

class Railing extends EventEmitter {
  constructor (bootstrapers) {
    super()
    this.bootstrapers = bootstrapers
  }

  start (callback) {
    setImmediate(callback)
    setImmediate(() => {
      this.bootstrapers.forEach((candidate) => {
        candidate = multiaddr(candidate)

        let ma
        if (includes(candidate.protoNames(), 'ipfs')) {
          ma = candidate.decapsulate('ipfs')
        }

        // TODO: switch for multiaddr.getPeerId once merged
        let peerIdB58Str
        try {
          peerIdB58Str = candidate.stringTuples().filter((tuple) => {
            if (tuple[0] === candidate.protos().filter((proto) => {
              return proto.name === 'ipfs'
            })[0].code) {
              return true
            }
          })[0][1]
        } catch (e) {
          throw new Error('Error extracting IPFS id from multiaddr', e)
        }

        const peerId = PeerId.createFromB58String(peerIdB58Str)
        PeerInfo.create(peerId, (err, peerInfo) => {
          if (err) {
            return log.error('Error creating PeerInfo from bootstrap peer', err)
          }

          peerInfo.multiaddrs.add(ma)

          this.emit('peer', peerInfo)
        })
      })
    })
  }

  stop (callback) {
    setImmediate(callback)
  }
}

module.exports = Railing
