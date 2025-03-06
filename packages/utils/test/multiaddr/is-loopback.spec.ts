/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { isLoopback } from '../../src/multiaddr/is-loopback.js'

describe('multiaddr isLoopback', () => {
  it('identifies loopback ip4 multiaddrs', () => {
    [
      multiaddr('/ip4/127.0.0.1/tcp/1000'),
      multiaddr('/ip4/127.0.1.1/tcp/1000'),
      multiaddr('/ip4/127.1.1.1/tcp/1000'),
      multiaddr('/ip4/127.255.255.255/tcp/1000')
    ].forEach(ma => {
      expect(isLoopback(ma)).to.be.true(`"${ma}" was not identified as loopback`)
    })
  })

  it('identifies non loopback ip4 multiaddrs', () => {
    [
      multiaddr('/ip4/101.0.26.90/tcp/1000'),
      multiaddr('/ip4/10.0.0.1/tcp/1000'),
      multiaddr('/ip4/192.168.0.1/tcp/1000'),
      multiaddr('/ip4/172.16.0.1/tcp/1000')
    ].forEach(ma => {
      expect(isLoopback(ma)).to.be.false(`"${ma}" was identified as loopback`)
    })
  })

  it('identifies loopback ip6 multiaddrs', () => {
    [
      multiaddr('/ip6/::1/tcp/1000')
    ].forEach(ma => {
      expect(isLoopback(ma)).to.be.true(`"${ma}" was not identified as loopback`)
    })
  })

  it('identifies non loopback ip6 multiaddrs', () => {
    [
      multiaddr('/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/1000'),
      multiaddr('/ip6/::/tcp/1000')
    ].forEach(ma => {
      expect(isLoopback(ma)).to.be.false(`"${ma}" was identified as loopback`)
    })
  })

  it('identifies other multiaddrs as not loopback addresses', () => {
    [
      multiaddr('/dns4/wss0.bootstrap.libp2p.io/tcp/443'),
      multiaddr('/dns6/wss0.bootstrap.libp2p.io/tcp/443'),
      multiaddr('/unix/path/to/socket'),
      multiaddr('/memory/addr-1')
    ].forEach(ma => {
      expect(isLoopback(ma)).to.be.false(`"${ma}" was identified as loopback`)
    })
  })
})
