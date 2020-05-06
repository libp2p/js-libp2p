'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
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

  it('adds peer address to AddressBook when establishing connection', async () => {
    const spyAddressBook = sinon.spy(libp2p.peerStore.addressBook, 'add')
    const remoteMultiaddr = `${remoteLibp2p.multiaddrs[0]}/p2p/${remoteLibp2p.peerId.toB58String()}`
    const conn = await libp2p.dial(remoteMultiaddr)

    expect(conn).to.exist()
    expect(spyAddressBook).to.have.property('callCount', 1)
  })
})
