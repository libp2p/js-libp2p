/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Multiaddr } = require('multiaddr')

const arrayEquals = require('../src/array-equals')

describe('non primitive array equals', () => {
  it('returns true if two arrays of multiaddrs are equal', () => {
    const a = [
      new Multiaddr('/ip4/127.0.0.1/tcp/8000'),
      new Multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      new Multiaddr('/ip4/127.0.0.1/tcp/8000'),
      new Multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(true)
  })

  it('returns true if two arrays of multiaddrs have the same content but different orders', () => {
    const a = [
      new Multiaddr('/ip4/127.0.0.1/tcp/8000'),
      new Multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      new Multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      new Multiaddr('/ip4/127.0.0.1/tcp/8000'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(true)
  })

  it('returns false if two arrays of multiaddrs are different', () => {
    const a = [
      new Multiaddr('/ip4/127.0.0.1/tcp/8000'),
      new Multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      new Multiaddr('/ip4/127.0.0.1/tcp/8001'),
      new Multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(false)
  })

  it('returns false if two arrays of multiaddrs are partially equal, but different lengths', () => {
    const a = [
      new Multiaddr('/ip4/127.0.0.1/tcp/8000'),
      new Multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      new Multiaddr('/ip4/127.0.0.1/tcp/8000'),
      new Multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(false)
  })
})
