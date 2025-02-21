/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { isIpBased } from '../../src/multiaddr/is-ip-based.js'

describe('multiaddr isIpBased', () => {
  it('identifies IP-based multiaddrs', () => {
    [
      multiaddr('/ip4/169.254.35.4'),
      multiaddr('/ip4/169.254.35.4/tcp/1000'),
      multiaddr('/ip4/169.254.0.0/tcp/1000'),
      multiaddr('/ip4/169.254.255.255/tcp/1000'),
      multiaddr('/ip4/101.0.26.90/tcp/1000'),
      multiaddr('/ip4/10.0.0.1/tcp/1000'),
      multiaddr('/ip4/192.168.0.1/tcp/1000'),
      multiaddr('/ip4/172.16.0.1/tcp/1000'),
      multiaddr('/ip6/fe80::1%lo0/tcp/1000'),
      multiaddr('/ip6/fe80::1893:def4:af04:635a%en'),
      multiaddr('/ip6/fe80::1893:def4:af04:635a'),
      multiaddr('/ip6/fe80::1893:def4:af04:635a/udp/2183'),
      multiaddr('/ip6/::/tcp/1000'),
      multiaddr('/ip6/::2:0:59c:a24:801/tcp/64142')
    ].forEach(ma => {
      expect(isIpBased(ma)).to.be.true(`"${ma}" was not identified as IP based`)
    })
  })

  it('identifies non-IP-based multiaddrs', () => {
    [
      multiaddr('/memory/address-1'),
      multiaddr('/unix/path/to/socket'),
      multiaddr('/dns4/wss0.bootstrap.libp2p.io/tcp/443'),
      multiaddr('/dns6/wss0.bootstrap.libp2p.io/tcp/443'),
      multiaddr('/dnsaddr/wss0.bootstrap.libp2p.io/tcp/443')
    ].forEach(ma => {
      expect(isIpBased(ma)).to.be.false(`"${ma}" was identified as IP based`)
    })
  })
})
