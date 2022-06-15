/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { arrayEquals } from '../src/array-equals.js'

describe('non primitive array equals', () => {
  it('returns true if two arrays of multiaddrs are equal', () => {
    const a = [
      multiaddr('/ip4/127.0.0.1/tcp/8000'),
      multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      multiaddr('/ip4/127.0.0.1/tcp/8000'),
      multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(true)
  })

  it('returns true if two arrays of multiaddrs have the same content but different orders', () => {
    const a = [
      multiaddr('/ip4/127.0.0.1/tcp/8000'),
      multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      multiaddr('/ip4/127.0.0.1/tcp/8000'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(true)
  })

  it('returns false if two arrays of multiaddrs are different', () => {
    const a = [
      multiaddr('/ip4/127.0.0.1/tcp/8000'),
      multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      multiaddr('/ip4/127.0.0.1/tcp/8001'),
      multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(false)
  })

  it('returns false if two arrays of multiaddrs are partially equal, but different lengths', () => {
    const a = [
      multiaddr('/ip4/127.0.0.1/tcp/8000'),
      multiaddr('/ip4/127.0.0.1/tcp/3000/ws'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    const b = [
      multiaddr('/ip4/127.0.0.1/tcp/8000'),
      multiaddr('/dns4/test.libp2p.io')
    ]

    expect(arrayEquals(a, b)).to.eql(false)
  })
})
