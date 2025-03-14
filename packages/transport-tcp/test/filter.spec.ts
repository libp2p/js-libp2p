import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { tcp } from '../src/index.js'
import type { Transport } from '@libp2p/interface'

describe('filter addrs', () => {
  const base = '/ip4/127.0.0.1'
  const ipfs = '/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw'
  const unix = '/tmp/some/file.sock'

  let transport: Transport

  before(() => {
    transport = tcp()({
      logger: defaultLogger()
    })
  })

  it('filter valid addrs for this transport', () => {
    const ma1 = multiaddr(base + '/tcp/9090')
    const ma2 = multiaddr(base + '/udp/9090')
    const ma3 = multiaddr(base + '/tcp/9090/http')
    const ma4 = multiaddr(base + '/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const ma5 = multiaddr(base + '/tcp/9090/http' + ipfs)
    const ma6 = multiaddr('/ip4/127.0.0.1/tcp/9090/p2p-circuit' + ipfs)
    const ma7 = multiaddr('/dns4/libp2p.io/tcp/9090')
    const ma8 = multiaddr('/dnsaddr/libp2p.io/tcp/9090')
    const ma9 = multiaddr('/unix' + unix)

    const valid = transport.dialFilter([ma1, ma2, ma3, ma4, ma5, ma6, ma7, ma8, ma9])
    expect(valid.length).to.equal(5)
    expect(valid[0]).to.deep.equal(ma1)
    expect(valid[1]).to.deep.equal(ma4)
    expect(valid[2]).to.deep.equal(ma7)
    expect(valid[3]).to.deep.equal(ma8)
    expect(valid[4]).to.deep.equal(ma9)
  })

  it('filter a single addr for this transport', () => {
    const ma1 = multiaddr(base + '/tcp/9090')

    const valid = transport.dialFilter([ma1])
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.eql(ma1)
  })
})
