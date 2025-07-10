import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createConnection } from '../../src/connection.js'
import { defaultConnectionComponents, defaultConnectionInit } from './utils.ts'
import type { ConnectionComponents, ConnectionInit } from '../../src/connection.js'

describe('connection', () => {
  let components: ConnectionComponents
  let init: ConnectionInit

  beforeEach(async () => {
    components = defaultConnectionComponents()
    init = await defaultConnectionInit()
  })

  it('should not require local or remote addrs', async () => {
    const conn = createConnection(components, init)

    expect(conn).to.be.ok()
  })

  it('should append remote peer id to address if not already present', async () => {
    const conn = createConnection(components, await defaultConnectionInit({
      remoteAddr: multiaddr('/ip4/123.123.123.123/tcp/1234')
    }))

    expect(conn.remoteAddr.getComponents().filter(component => component.name === 'p2p')).to.have.lengthOf(1)
  })

  it('should not append remote peer id to address if present', async () => {
    const remotePeer = peerIdFromString('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')

    const conn = createConnection(components, await defaultConnectionInit({
      remotePeer,
      remoteAddr: multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)
    }))

    expect(conn.remoteAddr.getComponents().filter(component => component.name === 'p2p')).to.have.lengthOf(1)
  })
})
