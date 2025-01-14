/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { isLinkLocalIp } from '../src/link-local-ip.js'

describe('isLinkLocalIp', () => {
  it('identifies link-local ip4 multiaddrs', () => {
    [
      '169.254.35.4',
      '169.254.35.4',
      '169.254.0.0',
      '169.254.255.255'
    ].forEach(ma => {
      expect(isLinkLocalIp(ma)).to.be.true()
    })
  })

  it('identifies non link-local ip4 multiaddrs', () => {
    [
      '101.0.26.90',
      '10.0.0.1',
      '192.168.0.1',
      '172.16.0.1'
    ].forEach(ma => {
      expect(isLinkLocalIp(ma)).to.be.false()
    })
  })

  it('identifies link-local ip6 multiaddrs', () => {
    [
      'fe80::1%lo0',
      'fe80::1%lo0',
      'fe80::1893:def4:af04:635a%en',
      'fe80::1893:def4:af04:635a',
      'fe80::1893:def4:af04:635a'
    ].forEach(ma => {
      expect(isLinkLocalIp(ma)).to.be.true()
    })
  })

  it('identifies non link-local ip6 multiaddrs', () => {
    [
      '2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095',
      '::'
    ].forEach(ma => {
      expect(isLinkLocalIp(ma)).to.be.false()
    })
  })

  it('identifies other multiaddrs as not link-local addresses', () => {
    [
      'wss0.bootstrap.libp2p.io',
      'wss0.bootstrap.libp2p.io'
    ].forEach(ma => {
      expect(isLinkLocalIp(ma)).to.be.false()
    })
  })
})
