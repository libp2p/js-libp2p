/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddrToIpNet } from '../../src/connection-manager/utils.js'

describe('multiaddrToIpNet', () => {
  it('should convert a simple IPv4 multiaddr to an IpNet', () => {
    const ma = '/ip4/127.0.0.1'
    const ipNet = multiaddrToIpNet(ma)
    expect(ipNet.toString()).to.equal('127.0.0.1/32')
  })

  it('should convert a multiaddr with an IPv4 ipcidr to an IpNet', () => {
    const ma = '/ip4/127.0.0.1/ipcidr/32'
    const ipNet = multiaddrToIpNet(ma)
    expect(ipNet.toString()).to.equal('127.0.0.1/32')
  })

  it('should convert a simple IPv6 multiaddr to an IpNet', () => {
    const ma = '/ip6/::1/ipcidr/128'
    const ipNet = multiaddrToIpNet(ma)
    expect(ipNet.toString()).to.equal('0000:0000:0000:0000:0000:0000:0000:0001/128')
  })

  it('should convert a multiaddr with an IPv6 ipcidr to an IpNet', () => {
    const ma = '/ip6/2001:db8::/ipcidr/64'
    const ipNet = multiaddrToIpNet(ma)
    expect(ipNet.toString()).to.equal('2001:0db8:0000:0000:0000:0000:0000:0000/64')
  })

  it('should throw an error for invalid multiaddr', () => {
    const ma = '/ip6/invalid::address'
    expect(() => multiaddrToIpNet(ma)).to.throw(Error, 'Invalid multiaddr')
  })

  it('should expand shorthand IPv6 addresses to full form', () => {
    const ma = '/ip6/2001:db8::1/ipcidr/128'
    const ipNet = multiaddrToIpNet(ma)
    expect(ipNet.toString()).to.equal('2001:0db8:0000:0000:0000:0000:0000:0001/128')
  })

  /*
  // TODO: Re-enable when check is implemented
  it('should throw an error for invalid CIDR value in IPv4 and IPv6 multiaddr', () => {
    const invalidIPv6 = '/ip6/2001:db8::1/ipcidr/256'
    const invalidIPv4 = '/ip4/192.168.1.1/ipcidr/33'

    expect(() => multiaddrToIpNet(invalidIPv6)).to.throw(Error, 'Invalid CIDR value')
    expect(() => multiaddrToIpNet(invalidIPv4)).to.throw(Error, 'Invalid CIDR value')
  })
  */

  it('should handle IPv6 address with different prefix lengths (e.g., /0, /48, /128)', () => {
    const testCases = [
      { ma: '/ip6/2001:db8::/ipcidr/0', expected: '0000:0000:0000:0000:0000:0000:0000:0000/0' },
      { ma: '/ip6/2001:db8:abcd:0000::1/ipcidr/48', expected: '2001:0db8:abcd:0000:0000:0000:0000:0000/48' },
      { ma: '/ip6/2001:db8:abcd:1234::1/ipcidr/128', expected: '2001:0db8:abcd:1234:0000:0000:0000:0001/128' }
    ]

    testCases.forEach(({ ma, expected }) => {
      const ipNet = multiaddrToIpNet(ma)
      expect(ipNet.toString()).to.equal(expected)
    })
  })
})
