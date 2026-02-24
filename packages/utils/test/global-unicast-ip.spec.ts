import { expect } from 'aegir/chai'
import { isGlobalUnicastIp } from '../src/global-unicast-ip.js'

describe('isGlobalUnicastIp', () => {
  it('identifies ip4 multiaddrs as non-global unicast', () => {
    [
      '169.254.35.4',
      '169.254.35.4',
      '169.254.0.0',
      '169.254.255.255',
      '101.0.26.90',
      '10.0.0.1',
      '192.168.0.1',
      '172.16.0.1'
    ].forEach(ma => {
      expect(isGlobalUnicastIp(ma)).to.be.false(`"${ma}" was identified as global unicast`)
    })
  })

  it('identifies global unicast ip6 multiaddrs', () => {
    [
      '2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095',
      '2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095%en0'
    ].forEach(ma => {
      expect(isGlobalUnicastIp(ma)).to.be.true(`"${ma}" was not identified as global unicast`)
    })
  })

  it('identifies non global unicast ip6 multiaddrs', () => {
    [
      '::',
      'fe80::1%lo0',
      'fe80::1%lo0',
      'fe80::1893:def4:af04:635a%en',
      'fe80::1893:def4:af04:635a',
      'fe80::1893:def4:af04:635a',
      '::2:0:59c:a24:801'
    ].forEach(ma => {
      expect(isGlobalUnicastIp(ma)).to.be.false(`"${ma}" was identified as global unicast`)
    })
  })

  it('identifies other multiaddrs as not global unicast addresses', () => {
    [
      'wss0.bootstrap.libp2p.io',
      'wss0.bootstrap.libp2p.io'
    ].forEach(ma => {
      expect(isGlobalUnicastIp(ma)).to.be.false(`"${ma}" was identified as global unicast`)
    })
  })
})
