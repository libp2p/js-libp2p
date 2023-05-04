/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { webSockets } from '@libp2p/websockets'
import { plaintext } from '../../src/insecure/index.js'
import { createLibp2p, Libp2p } from '../../src/index.js'
import { MemoryDatastore } from 'datastore-core'

describe('peer-id', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should create a PeerId if none is passed', async () => {
    libp2p = await createLibp2p({
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    expect(libp2p.peerId).to.be.ok()
  })

  it('should retrieve the PeerId from the datastore', async () => {
    const datastore = new MemoryDatastore()

    libp2p = await createLibp2p({
      datastore,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    // this PeerId was created by default
    const peerId = libp2p.peerId

    await libp2p.stop()

    // create a new node from the same datastore
    libp2p = await createLibp2p({
      datastore,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    // the new node should have read the PeerId from the datastore
    // instead of creating a new one
    expect(libp2p.peerId.toString()).to.equal(peerId.toString())
  })

  it('should retrieve the PeerId from the datastore with a keychain password', async () => {
    const datastore = new MemoryDatastore()
    const keychain = {
      pass: 'very-long-password-must-be-over-twenty-characters-long',
      dek: {
        salt: 'CpjNIxMqAZ+aJg+ezLfuzG4a'
      }
    }

    libp2p = await createLibp2p({
      datastore,
      keychain,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    // this PeerId was created by default
    const peerId = libp2p.peerId

    await libp2p.stop()

    // create a new node from the same datastore
    libp2p = await createLibp2p({
      datastore,
      keychain,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    // the new node should have read the PeerId from the datastore
    // instead of creating a new one
    expect(libp2p.peerId.toString()).to.equal(peerId.toString())
  })

  it('should fail to start if retrieving the PeerId from the datastore fails', async () => {
    const datastore = new MemoryDatastore()
    const keychain = {
      pass: 'very-long-password-must-be-over-twenty-characters-long',
      dek: {
        salt: 'CpjNIxMqAZ+aJg+ezLfuzG4a'
      }
    }

    libp2p = await createLibp2p({
      datastore,
      keychain,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })
    await libp2p.stop()

    // creating a new node from the same datastore but with the wrong keychain config should fail
    await expect(createLibp2p({
      datastore,
      keychain: {
        pass: 'different-very-long-password-must-be-over-twenty-characters-long',
        dek: {
          salt: 'different-CpjNIxMqAZ+aJg+ezLfuzG4a'
        }
      },
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })).to.eventually.rejectedWith('Invalid PEM formatted message')
  })
})
