/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const TCP = require('../src')
const multiaddr = require('multiaddr')

describe('filter addrs', () => {
  const base = '/ip4/127.0.0.1'
  const ipfs = '/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw'

  let tcp

  before(() => {
    tcp = new TCP({ upgrader: {} })
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

    const valid = tcp.filter([ma1, ma2, ma3, ma4, ma5, ma6, ma7, ma8])
    expect(valid.length).to.equal(4)
    expect(valid[0]).to.deep.equal(ma1)
    expect(valid[1]).to.deep.equal(ma4)
  })

  it('filter a single addr for this transport', () => {
    const ma1 = multiaddr(base + '/tcp/9090')

    const valid = tcp.filter(ma1)
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.eql(ma1)
  })
})
