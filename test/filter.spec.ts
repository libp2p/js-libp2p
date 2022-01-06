import { expect } from 'aegir/utils/chai.js'
import { TCP } from '../src/index.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/transport/utils'

describe('filter addrs', () => {
  const base = '/ip4/127.0.0.1'
  const ipfs = '/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw'

  let tcp: TCP

  before(() => {
    tcp = new TCP({ upgrader: mockUpgrader() })
  })

  it('filter valid addrs for this transport', () => {
    const ma1 = new Multiaddr(base + '/tcp/9090')
    const ma2 = new Multiaddr(base + '/udp/9090')
    const ma3 = new Multiaddr(base + '/tcp/9090/http')
    const ma4 = new Multiaddr(base + '/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const ma5 = new Multiaddr(base + '/tcp/9090/http' + ipfs)
    const ma6 = new Multiaddr('/ip4/127.0.0.1/tcp/9090/p2p-circuit' + ipfs)
    const ma7 = new Multiaddr('/dns4/libp2p.io/tcp/9090')
    const ma8 = new Multiaddr('/dnsaddr/libp2p.io/tcp/9090')

    const valid = tcp.filter([ma1, ma2, ma3, ma4, ma5, ma6, ma7, ma8])
    expect(valid.length).to.equal(4)
    expect(valid[0]).to.deep.equal(ma1)
    expect(valid[1]).to.deep.equal(ma4)
  })

  it('filter a single addr for this transport', () => {
    const ma1 = new Multiaddr(base + '/tcp/9090')

    const valid = tcp.filter([ma1])
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.eql(ma1)
  })
})
