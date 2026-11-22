/* spell-checker:disable */
import { expect } from 'aegir/chai'
import { isPrivateIp } from '../src/private-ip.ts'

describe('private-ip', function () {
  const pubIps = [
    '44.37.112.180',
    '46.192.247.73',
    '71.12.102.112',
    '101.0.26.90',
    '111.211.73.40',
    '156.238.194.84',
    '164.101.185.82',
    '223.231.138.242',
    '226.84.185.150',
    '227.202.96.196',
    '::1fff:0.0.0.0',
    '::1fff:10.0.0.0',
    '::1fff:0:0.0.0.0',
    '::1fff:0:10.0.0.0',
    '2001:2:ffff:ffff:ffff:ffff:ffff:ffff',
    '64:ff9a::0.0.0.0',
    '64:ff9a::255.255.255.255',
    '99::',
    '99::ffff:ffff:ffff:ffff',
    '101::',
    '101::ffff:ffff:ffff:ffff',
    '2000::',
    '2000::ffff:ffff:ffff:ffff:ffff:ffff',
    '2001:10::',
    '2001:1f:ffff:ffff:ffff:ffff:ffff:ffff',
    '2001:db7::',
    '2001:db7:ffff:ffff:ffff:ffff:ffff:ffff',
    '2001:db9::',
    'fb00::',
    'fbff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    'fec0::'
  ]

  const privIps = [
    '0.0.0.0',
    '0.0.0.1',
    '0.0.0.7',
    '0.0.0.255',
    '0.0.255.255',
    '0.1.255.255',
    '0.15.255.255',
    '0.63.255.255',
    '0.255.255.254',
    '0.255.255.255',
    '10.0.0.0',
    '10.0.0.1',
    '10.255.255.254',
    '10.255.255.255',
    '100.64.0.0',
    '100.64.0.1',
    '100.127.255.254',
    '100.127.255.255',
    '127.0.0.0',
    '127.0.0.1',
    '127.255.255.254',
    '127.255.255.255',
    '169.254.0.0',
    '169.254.0.1',
    '169.254.255.254',
    '169.254.255.255',
    '172.16.0.0',
    '172.16.0.1',
    '172.31.255.254',
    '172.31.255.255',
    '192.0.0.0',
    '192.0.0.1',
    '192.0.0.6',
    '192.0.0.7',
    '192.0.0.8',
    '192.0.0.9',
    '192.0.0.10',
    '192.0.0.11',
    '192.0.0.170',
    '192.0.0.171',
    '192.0.0.254',
    '192.0.0.255',
    '192.0.2.0',
    '192.0.2.1',
    '192.0.2.254',
    '192.0.2.255',
    '192.31.196.0',
    '192.31.196.1',
    '192.31.196.254',
    '192.31.196.255',
    '192.52.193.0',
    '192.52.193.1',
    '192.52.193.254',
    '192.52.193.255',
    '192.88.99.0',
    '192.88.99.1',
    '192.88.99.254',
    '192.88.99.255',
    '192.168.0.0',
    '192.168.0.1',
    '192.168.255.254',
    '192.168.255.255',
    '192.175.48.0',
    '192.175.48.1',
    '192.175.48.254',
    '192.175.48.255',
    '198.18.0.0',
    '198.18.0.1',
    '198.19.255.254',
    '198.19.255.255',
    '198.51.100.0',
    '198.51.100.1',
    '198.51.100.254',
    '198.51.100.255',
    '203.0.113.0',
    '203.0.113.1',
    '203.0.113.254',
    '203.0.113.255',
    '240.0.0.0',
    '240.0.0.1',
    '255.0.0.0',
    '255.192.0.0',
    '255.240.0.0',
    '255.254.0.0',
    '255.255.0.0',
    '255.255.255.0',
    '255.255.255.248',
    '255.255.255.254',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:0.0.0.0',
    '::ffff:255.255.255.255',
    '64:ff9b::0.0.0.0',
    '64:ff9b::16.10.11.1',
    '64:ff9b::255.255.255.255',
    '100::',
    '100::0:0:0:0',
    '100::1:eabc:0:2',
    '100::ffff:ffff:ffff:ffff',
    '2001::',
    '2001::a:b:c',
    '2001::ffff:ffff:ffff:ffff:ffff:ffff',
    '2001:20::',
    '2001:20::a:b:c',
    '2001:2f::a:b:c',
    '2001:2f:ffff:ffff:ffff:ffff:ffff:ffff',
    '2001:db8::',
    '2001:db8::1',
    '2001:db8:abc::1',
    '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff',
    '2002::',
    '2002::1',
    '2002::abc:1',
    '2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    'fe80::',
    'fe80::1',
    'fe80::abc:1',
    'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    'fc00::',
    'fc00::1',
    'fc00::abc:1',
    'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    'ff00::',
    'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'
  ]

  const invalidIps = [
    '100::ffff::',
    '::ffff:0.0.255.255.255',
    '::ffff:0.255.255.255.255',
    // zone ids are only valid on IPv6
    '127.0.0.1%eth0',
    // leading zeros are not allowed in IPv4 octets, mapped or not
    '127.0.0.01',
    '::ffff:127.0.0.01',
    '::ffff:192.168.001.001'
  ]

  it('identifies public ips', function () {
    for (const ip of pubIps) {
      expect(isPrivateIp(ip)).to.be.false(`isPrivateIp('${ip}') should be false`)
    }
  })

  it('identifies private ips', function () {
    for (const ip of privIps) {
      expect(isPrivateIp(ip)).to.be.true(`isPrivateIp('${ip}') should be true`)
    }
  })

  it('returns the same result for every spelling of an IPv6 address', function () {
    // each group is one address in different valid spellings: compressed,
    // uncompressed, leading zeros, upper case
    const privateSpellings = [
      ['::1', '0:0:0:0:0:0:0:1', '0000:0000:0000:0000:0000:0000:0000:0001', '::0001'],
      ['::', '0::0', '0:0:0:0:0:0:0:0', '0000:0000:0000:0000:0000:0000:0000:0000'],
      ['::ffff:10.0.0.1', '::FFFF:10.0.0.1', '::ffff:a00:1', '::FFFF:0A00:0001', '0:0:0:0:0:ffff:10.0.0.1', '0:0:0:0:0:ffff:a00:1'],
      ['2001:db8::1', '2001:0db8::1', '2001:DB8::1', '2001:0db8:0:0:0:0:0:1'],
      ['fe80::1', 'FE80::1', 'fe80:0:0:0:0:0:0:1', 'fe80:0000:0000:0000:0000:0000:0000:0001'],
      ['fd00::1', 'FD00::1', 'fd00:0:0:0:0:0:0:1'],
      ['ff02::1', 'FF02::1', 'ff02:0:0:0:0:0:0:1'],
      ['100::', '0100::', '100:0:0:0:0:0:0:0'],
      ['2002::1', '2002:0:0:0:0:0:0:1'],
      ['2001:20::1', '2001:0020::1', '2001:20:0:0:0:0:0:1']
    ]

    const publicSpellings = [
      ['::ffff:8.8.8.8', '::FFFF:8.8.8.8', '::ffff:808:808', '0:0:0:0:0:ffff:808:808'],
      ['2000::', '2000:0:0:0:0:0:0:0'],
      ['2606:4700:4700::1111', '2606:4700:4700:0:0:0:0:1111', '2606:4700:4700:0000:0000:0000:0000:1111'],
      ['2001:db9::', '2001:0db9::', '2001:DB9::', '2001:db9:0:0:0:0:0:0'],
      ['::1fff:10.0.0.0', '0:0:0:0:0:1fff:a00:0']
    ]

    for (const spellings of privateSpellings) {
      for (const ip of spellings) {
        expect(isPrivateIp(ip)).to.be.true(`isPrivateIp('${ip}') should be true`)
      }
    }

    for (const spellings of publicSpellings) {
      for (const ip of spellings) {
        expect(isPrivateIp(ip)).to.be.false(`isPrivateIp('${ip}') should be false`)
      }
    }
  })

  it('identifies NAT64 (64:ff9b::/96) addresses in their hex form', function () {
    // hex form of 64:ff9b::10.0.0.1 etc, as multiaddr normalizes it
    const privateIps = [
      '64:ff9b::a00:1',
      '64:ff9b::808:808',
      '64:ff9b::ffff:ffff',
      '64:ff9b:0:0:0:0:a00:1',
      '0064:ff9b:0000:0000:0000:0000:0a00:0001',
      '64:FF9B::A00:1'
    ]

    for (const ip of privateIps) {
      expect(isPrivateIp(ip)).to.be.true(`isPrivateIp('${ip}') should be true`)
    }

    // not part of 64:ff9b::/96
    const publicIps = [
      '64:ff9a::a00:1',
      '64:ff9c::a00:1',
      '64:ff9b:0:0:0:1:a00:1',
      '64:ff9b:1::a00:1'
    ]

    for (const ip of publicIps) {
      expect(isPrivateIp(ip)).to.be.false(`isPrivateIp('${ip}') should be false`)
    }
  })

  it('identifies Teredo (2001::/32) addresses with non-zero trailing hextets', function () {
    // example Teredo address
    const privateIps = [
      '2001:0:4136:e378:8000:63bf:3fff:fdd2',
      '2001:0000:4136:e378:8000:63bf:3fff:fdd2',
      '2001:0:ffff:ffff:ffff:ffff:ffff:ffff',
      '2001:0:1::1'
    ]

    for (const ip of privateIps) {
      expect(isPrivateIp(ip)).to.be.true(`isPrivateIp('${ip}') should be true`)
    }

    // 2001:1::/32 is not Teredo
    expect(isPrivateIp('2001:1:4136:e378:8000:63bf:3fff:fdd2')).to.be.false()
  })

  it('identifies invalid ips', function () {
    for (const ip of invalidIps) {
      expect(isPrivateIp(ip)).to.be.undefined(`isPrivateIp('${ip}') should be undefined`)
    }
  })
})
