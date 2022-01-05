/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { isPrivate } from '../../src/multiaddr/is-private.js'

describe('multiaddr isPrivate', () => {
  it('identifies private ip4 multiaddrs', () => {
    [
      new Multiaddr('/ip4/127.0.0.1/tcp/1000'),
      new Multiaddr('/ip4/10.0.0.1/tcp/1000'),
      new Multiaddr('/ip4/192.168.0.1/tcp/1000'),
      new Multiaddr('/ip4/172.16.0.1/tcp/1000')
    ].forEach(ma => {
      expect(isPrivate(ma)).to.eql(true)
    })
  })

  it('identifies public ip4 multiaddrs', () => {
    [
      new Multiaddr('/ip4/101.0.26.90/tcp/1000'),
      new Multiaddr('/ip4/40.1.20.9/tcp/1000'),
      new Multiaddr('/ip4/92.168.0.1/tcp/1000'),
      new Multiaddr('/ip4/2.16.0.1/tcp/1000')
    ].forEach(ma => {
      expect(isPrivate(ma)).to.eql(false)
    })
  })

  it('identifies private ip6 multiaddrs', () => {
    [
      new Multiaddr('/ip6/fd52:8342:fc46:6c91:3ac9:86ff:fe31:7095/tcp/1000'),
      new Multiaddr('/ip6/fd52:8342:fc46:6c91:3ac9:86ff:fe31:1/tcp/1000')
    ].forEach(ma => {
      expect(isPrivate(ma)).to.eql(true)
    })
  })

  it('identifies public ip6 multiaddrs', () => {
    [
      new Multiaddr('/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/1000'),
      new Multiaddr('/ip6/2000:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/1000')
    ].forEach(ma => {
      expect(isPrivate(ma)).to.eql(false)
    })
  })

  it('identifies other multiaddrs as not private addresses', () => {
    [
      new Multiaddr('/dns4/wss0.bootstrap.libp2p.io/tcp/443'),
      new Multiaddr('/dns6/wss0.bootstrap.libp2p.io/tcp/443')
    ].forEach(ma => {
      expect(isPrivate(ma)).to.eql(false)
    })
  })
})
