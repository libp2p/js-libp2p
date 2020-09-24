'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const errCode = require('err-code')
const { isNode, isWebWorker } = require('ipfs-utils/src/env')

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')

const peerUtils = require('../utils/creators/peer')
const mockConnection = require('../utils/mockConnection')
const baseOptions = require('../utils/base-options.browser')
const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')

const relayAddr = MULTIADDRS_WEBSOCKETS[0]
const code = 'HANDLER_ERROR'
const errorMsg = 'handle error'

describe('event handlers error', () => {
  // TODO: Need a way of catching the error in the process and absorb it
  if (isWebWorker) {
    return
  }

  let libp2p
  let peerId

  before(async () => {
    peerId = await PeerId.create()
  })

  beforeEach(async () => {
    [libp2p] = await peerUtils.createPeer({
      config: {
        modules: baseOptions.modules,
        addresses: {
          listen: [multiaddr(`${relayAddr}/p2p-circuit`)]
        }
      },
      started: true
    })
  })

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })

  it('should throw on "peer:connect" event handler error', async () => {
    const p = catchGlobalError()

    libp2p.connectionManager.on('peer:connect', () => {
      throw errCode(new Error(errorMsg), code)
    })

    const connection = await mockConnection()
    libp2p.connectionManager.onConnect(connection)

    await p
  })

  it('should throw on "peer:discovery" event handler error', async () => {
    const p = catchGlobalError()

    libp2p.on('peer:discovery', () => {
      throw errCode(new Error(errorMsg), code)
    })

    const ma = multiaddr('/ip4/127.0.0.1/tcp/0')
    libp2p.peerStore.addressBook.add(peerId, [ma])

    await p
  })
})

const catchGlobalError = () => {
  return new Promise((resolve) => {
    if (isNode) {
      const originalException = process.listeners('uncaughtException').pop()

      originalException && process.removeListener('uncaughtException', originalException)
      process.once('uncaughtException', (err) => {
        expect(err).to.exist()
        expect(err.code).to.eql(code)

        originalException && process.listeners('uncaughtException').push(originalException)
        resolve()
      })
    } else {
      window.onerror = () => {
        resolve()
      }
    }
  })
}
