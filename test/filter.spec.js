/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const TCP = require('../src')
const multiaddr = require('multiaddr')

describe('filter addrs', () => {
  let tcp

  before(() => {
    tcp = new TCP()
  })

  it('filter valid addrs for this transport', () => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const mh2 = multiaddr('/ip4/127.0.0.1/udp/9090')
    const mh3 = multiaddr('/ip4/127.0.0.1/tcp/9090/http')
    const mh4 = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const mh5 = multiaddr('/ip4/127.0.0.1/tcp/9090/http/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const mh6 = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw' +
      '/p2p-circuit/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

    const valid = tcp.filter([mh1, mh2, mh3, mh4, mh5, mh6])
    expect(valid.length).to.equal(2)
    expect(valid[0]).to.deep.equal(mh1)
    expect(valid[1]).to.deep.equal(mh4)
  })

  it('filter a single addr for this transport', () => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')

    const valid = tcp.filter(mh1)
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.deep.equal(mh1)
  })
})
