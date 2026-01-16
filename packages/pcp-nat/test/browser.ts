import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { isBrowser, isWebWorker } from 'wherearewe'
import { pcpNAT } from '../src/index.js'
import type { AddressManager } from '@libp2p/interface-internal'

describe('browser non-support', () => {
  it('should throw in browsers', async function () {
    if (!isBrowser && !isWebWorker) {
      return this.skip()
    }

    const components = {
      peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      nodeInfo: { name: 'test', version: 'test', userAgent: 'test' },
      logger: defaultLogger(),
      addressManager: stubInterface<AddressManager>(),
      events: new TypedEventEmitter()
    }

    expect(() => {
      pcpNAT('')(components)
    }).to.throw()
  })
})
