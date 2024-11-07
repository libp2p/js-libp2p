import { defaultLogger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { memory } from '../src/index.js'
import type { Upgrader, Connection } from '@libp2p/interface'

describe('memory', () => {
  let upgrader: Upgrader

  beforeEach(async () => {
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: async (maConn) => {
        return stubInterface<Connection>()
      },
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>()
      }
    })
  })

  it('should dial', async () => {
    const transport = memory()({
      peerId: peerIdFromString('12D3KooWJRSrypvnpHgc6ZAgyCni4KcSmbV7uGRaMw5LgMKT18fq'),
      logger: defaultLogger()
    })
    const ma = multiaddr('/memory/address-1')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    const conn = await transport.dial(ma, {
      upgrader
    })

    await conn.close()
    await listener.close()
  })

  it('should dial with latency', async () => {
    const latency = 1000
    const transport = memory({
      latency
    })({
      peerId: peerIdFromString('12D3KooWJRSrypvnpHgc6ZAgyCni4KcSmbV7uGRaMw5LgMKT18fq'),
      logger: defaultLogger()
    })
    const ma = multiaddr('/memory/address-1')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    const start = Date.now()
    const conn = await transport.dial(ma, {
      upgrader
    })
    const end = Date.now()

    // +/- a bit
    expect(end - start).to.be.greaterThan(latency / 1.1)

    await conn.close()
    await listener.close()
  })
})
