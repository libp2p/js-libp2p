import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { isNode, isElectronMain } from 'wherearewe'
import { getThinWaistAddresses } from '../src/get-thin-waist-addresses.js'

describe('get-thin-waist-addresses', () => {
  it('should not return addresses when not passed anything', () => {
    expect(getThinWaistAddresses()).to.have.lengthOf(0)
    expect(getThinWaistAddresses(undefined)).to.have.lengthOf(0)
  })

  it('should get thin waist addresses from specific address', () => {
    const input = multiaddr('/ip4/123.123.123.123/tcp/1234')
    const addrs = getThinWaistAddresses(input)

    expect(addrs).to.deep.equal([input])
  })

  it('should get thin waist addresses from specific address and override the port', () => {
    const input = multiaddr('/ip4/123.123.123.123/tcp/1234')
    const addrs = getThinWaistAddresses(input, 100)

    expect(addrs).to.deep.equal([multiaddr('/ip4/123.123.123.123/tcp/100')])
  })

  it('should ignore non-thin waist tuples from specific address', () => {
    const input = multiaddr('/ip4/123.123.123.123/udp/1234/webrtc')
    const addrs = getThinWaistAddresses(input)

    expect(addrs).to.deep.equal([
      multiaddr('/ip4/123.123.123.123/udp/1234')
    ])
  })

  it('should get thin waist addresses from IPv4 wildcard', function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    const input = multiaddr('/ip4/0.0.0.0/tcp/1234')
    const addrs = getThinWaistAddresses(input)

    expect(addrs).to.have.property('length').that.is.greaterThan(0)

    for (const addr of addrs) {
      const options = addr.toOptions()

      expect(options).to.have.property('family', 4)
      expect(options).to.have.property('host').that.does.not.equal('0.0.0.0')
    }
  })

  it('should get thin waist addresses from IPv4 wildcard and override the port', function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    const input = multiaddr('/ip4/0.0.0.0/tcp/1234')
    const addrs = getThinWaistAddresses(input, 100)

    expect(addrs).to.have.property('length').that.is.greaterThan(0)

    for (const addr of addrs) {
      const options = addr.toOptions()

      expect(options).to.have.property('family', 4)
      expect(options).to.have.property('host').that.does.not.equal('0.0.0.0')
      expect(options).to.have.property('port', 100)
    }
  })

  it('should get thin waist addresses from IPv6 wildcard', function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    const input = multiaddr('/ip6/::/tcp/1234')
    const addrs = getThinWaistAddresses(input)

    expect(addrs).to.have.property('length').that.is.greaterThan(0)

    for (const addr of addrs) {
      const options = addr.toOptions()

      expect(options).to.have.property('family', 6)
      expect(options).to.have.property('host').that.does.not.equal('::')
    }
  })

  it('should get thin waist addresses from IPv6 wildcard and override the port', function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    const input = multiaddr('/ip6/::/tcp/1234')
    const addrs = getThinWaistAddresses(input, 100)

    expect(addrs).to.have.property('length').that.is.greaterThan(0)

    for (const addr of addrs) {
      const options = addr.toOptions()

      expect(options).to.have.property('family', 6)
      expect(options).to.have.property('host').that.does.not.equal('::')
      expect(options).to.have.property('port', 100)
    }
  })
})
