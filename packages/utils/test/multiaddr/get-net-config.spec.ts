import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { getNetConfig, tryGetNetConfig } from '../../src/index.ts'

describe('multiaddr getNetConfig', () => {
  it('throws on empty multiaddr', () => {
    expect(() => getNetConfig(multiaddr())).to.throw()
  })

  it('identifies ip4 multiaddrs', () => {
    expect(getNetConfig(multiaddr('/ip4/169.254.35.4'))).to.deep.equal({
      type: 'ip4',
      host: '169.254.35.4'
    })
    expect(getNetConfig(multiaddr('/ip4/169.254.35.4/tcp/1000'))).to.deep.equal({
      type: 'ip4',
      host: '169.254.35.4',
      protocol: 'tcp',
      port: 1000
    })
  })

  it('identifies ip6 multiaddrs', () => {
    expect(getNetConfig(multiaddr('/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095'))).to.deep.equal({
      type: 'ip6',
      host: '2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095'
    })
    expect(getNetConfig(multiaddr('/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/1000'))).to.deep.equal({
      type: 'ip6',
      host: '2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095',
      protocol: 'tcp',
      port: 1000
    })
  })
})

describe('multiaddr tryGetNetConfig', () => {
  it('returns config for a network multiaddr', () => {
    expect(tryGetNetConfig(multiaddr('/ip4/127.0.0.1/tcp/1000'))).to.deep.equal({
      type: 'ip4',
      host: '127.0.0.1',
      protocol: 'tcp',
      port: 1000
    })
  })

  it('returns null for an empty multiaddr', () => {
    expect(tryGetNetConfig(multiaddr())).to.be.null()
  })

  it('returns null for a non-network multiaddr', () => {
    expect(tryGetNetConfig(multiaddr('/p2p/12D3KooWK43NgYJKLv3Rerrac9YQ5gz7tpFnmreLYH3AdEAa3PhW'))).to.be.null()
  })
})
