'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-bytes'))
const { expect } = chai
const sinon = require('sinon')

const baseOptions = require('../utils/base-options')
const peerUtils = require('../utils/creators/peer')

describe('libp2p.peerStore', () => {
  let libp2p, remoteLibp2p

  beforeEach(async () => {
    [libp2p, remoteLibp2p] = await peerUtils.createPeer({
      number: 2,
      populateAddressBooks: false,
      config: {
        ...baseOptions
      }
    })
  })

  it('adds peer address to AddressBook and keys to the keybook when establishing connection', async () => {
    const remoteIdStr = remoteLibp2p.peerId.toB58String()

    const spyAddressBook = sinon.spy(libp2p.peerStore.addressBook, 'add')
    const spyKeyBook = sinon.spy(libp2p.peerStore.keyBook, 'set')

    const remoteMultiaddr = `${remoteLibp2p.multiaddrs[0]}/p2p/${remoteIdStr}`
    const conn = await libp2p.dial(remoteMultiaddr)

    expect(conn).to.exist()
    expect(spyAddressBook).to.have.property('called', true)
    expect(spyKeyBook).to.have.property('called', true)

    const localPeers = libp2p.peerStore.peers
    expect(localPeers.size).to.equal(1)

    const publicKeyInLocalPeer = localPeers.get(remoteIdStr).id.pubKey
    expect(publicKeyInLocalPeer.bytes).to.equalBytes(remoteLibp2p.peerId.pubKey.bytes)

    const publicKeyInRemotePeer = remoteLibp2p.peerStore.keyBook.get(libp2p.peerId)
    expect(publicKeyInRemotePeer).to.exist()
    expect(publicKeyInRemotePeer.bytes).to.equalBytes(libp2p.peerId.pubKey.bytes)
  })
})
