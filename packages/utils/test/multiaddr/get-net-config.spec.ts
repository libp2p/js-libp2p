import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { getNetConfig } from '../../src/index.ts'

describe('multiaddr getNetConfig', () => {
  it('throws on empty multiaddr', () => {
      expect(() => getNetConfig(multiaddr())).to.throw();
  })

  it('identifies ip4 multiaddrs', () => {
    expect(getNetConfig(multiaddr('/ip4/169.254.35.4'))).to.deep.equal({
        type: 'ip4',
        host: '169.254.35.4',
    });
    expect(getNetConfig(multiaddr('/ip4/169.254.35.4/tcp/1000'))).to.deep.equal({
        type: 'ip4',
        host: '169.254.35.4',
        protocol: 'tcp',
        port: 1000
    });
  })

  it('identifies ip6 multiaddrs', () => {
    expect(getNetConfig(multiaddr('/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095'))).to.deep.equal({
        type: 'ip6',
        host: '2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095',
    });
    expect(getNetConfig(multiaddr('/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/1000'))).to.deep.equal({
        type: 'ip6',
        host: '2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095',
        protocol: 'tcp',
        port: 1000
    });
  })
})