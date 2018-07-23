/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const getMultiaddr = require('../src/get-multiaddr')

const goodSocket4 = {
  remoteAddress: '127.0.0.1',
  remotePort: '9090',
  remoteFamily: 'IPv4'
}

const goodSocket6 = {
  remoteAddress: '::1',
  remotePort: '9090',
  remoteFamily: 'IPv6'
}

const badSocket = {}

const badSocketData = {
  remoteAddress: 'aewmrn4awoew',
  remotePort: '234',
  remoteFamily: 'Hufflepuff'
}

describe('getMultiaddr multiaddr creation', () => {
  it('creates multiaddr from valid socket data', (done) => {
    expect(getMultiaddr(goodSocket4))
      .to.exist()
    done()
  })

  it('creates multiaddr from valid IPv6 socket data', (done) => {
    expect(getMultiaddr(goodSocket6))
      .to.exist()
    done()
  })

  it('returns undefined multiaddr from missing socket data', (done) => {
    expect(getMultiaddr(badSocket))
      .to.equal(undefined)
    done()
  })

  it('returns undefined multiaddr from unparseable socket data', (done) => {
    expect(getMultiaddr(badSocketData))
      .to.equal(undefined)
    done()
  })
})
