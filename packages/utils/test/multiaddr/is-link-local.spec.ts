/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { isLinkLocal } from '../../src/multiaddr/is-link-local.js'

describe('multiaddr isLinkLocal', () => {
  it('identifies link-local ip4 multiaddrs', () => {
    [
      multiaddr('/ip4/169.254.35.4'),
      multiaddr('/ip4/169.254.35.4/tcp/1000'),
      multiaddr('/ip4/169.254.0.0/tcp/1000'),
      multiaddr('/ip4/169.254.255.255/tcp/1000')
    ].forEach(ma => {
      expect(isLinkLocal(ma)).to.be.true(`"${ma}" was not identified as link local`)
    })
  })

  it('identifies non link-local ip4 multiaddrs', () => {
    [
      multiaddr('/ip4/101.0.26.90/tcp/1000'),
      multiaddr('/ip4/10.0.0.1/tcp/1000'),
      multiaddr('/ip4/192.168.0.1/tcp/1000'),
      multiaddr('/ip4/172.16.0.1/tcp/1000')
    ].forEach(ma => {
      expect(isLinkLocal(ma)).to.be.false(`"${ma}" was identified as link local`)
    })
  })

  it('identifies link-local ip6 multiaddrs', () => {
    [
      multiaddr('/ip6/fe80::1%lo0'),
      multiaddr('/ip6/fe80::1%lo0/tcp/1000'),
      multiaddr('/ip6/fe80::1893:def4:af04:635a%en'),
      multiaddr('/ip6/fe80::1893:def4:af04:635a'),
      multiaddr('/ip6/fe80::1893:def4:af04:635a/udp/2183')
    ].forEach(ma => {
      expect(isLinkLocal(ma)).to.be.true(`"${ma}" was not identified as link local`)
    })
  })

  it('identifies non link-local ip6 multiaddrs', () => {
    [
      multiaddr('/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/1000'),
      multiaddr('/ip6/::/tcp/1000')
    ].forEach(ma => {
      expect(isLinkLocal(ma)).to.be.false(`"${ma}" was identified as link local`)
    })
  })

  it('identifies other multiaddrs as not link-local addresses', () => {
    [
      multiaddr('/dns4/wss0.bootstrap.libp2p.io/tcp/443'),
      multiaddr('/dns6/wss0.bootstrap.libp2p.io/tcp/443'),
      multiaddr('/unix/path/to/socket'),
      multiaddr('/memory/addr-1')
    ].forEach(ma => {
      expect(isLinkLocal(ma)).to.be.false(`"${ma}" was identified as link local`)
    })
  })
})
