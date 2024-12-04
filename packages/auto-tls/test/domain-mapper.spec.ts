import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { DomainMapper } from '../src/domain-mapper.js'
import { importFromPem } from '../src/utils.js'
import { CERT, PRIVATE_KEY_PEM } from './fixtures/cert.js'
import type { ComponentLogger, Libp2pEvents, TypedEventTarget, Peer } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

export interface StubbedDomainMapperComponents {
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
  addressManager: StubbedInstance<AddressManager>
}

describe('domain-mapper', () => {
  let components: StubbedDomainMapperComponents
  let mapper: DomainMapper

  beforeEach(async () => {
    components = {
      logger: defaultLogger(),
      events: new TypedEventEmitter<Libp2pEvents>(),
      addressManager: stubInterface()
    }

    mapper = new DomainMapper(components, {
      domain: 'example.com'
    })

    await start(mapper)
  })

  afterEach(async () => {
    await stop(mapper)
  })

  it('should map domains on self peer update', () => {
    const ip4 = '81.12.12.9'
    const ip6 = '2001:4860:4860::8889'

    components.addressManager.getAddressesWithMetadata.returns([{
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/ip4/192.168.1.234/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/dns4/example.com/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr(`/ip4/${ip4}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }, {
      multiaddr: multiaddr(`/ip6/${ip6}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }])

    components.events.safeDispatchEvent('certificate:provision', {
      detail: {
        key: importFromPem(PRIVATE_KEY_PEM),
        cert: CERT
      }
    })

    expect(components.addressManager.addDNSMapping.calledWith('81-12-12-9.example.com', [
      ip4
    ])).to.be.true()
    expect(components.addressManager.addDNSMapping.calledWith('2001-4860-4860--8889.example.com', [
      ip6
    ])).to.be.true()
  })

  it('should update domain mapping on self peer update', () => {
    const ip4v1 = '81.12.12.9'
    const ip6v1 = '2001:4860:4860::8889'

    components.addressManager.getAddressesWithMetadata.returns([{
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/ip4/192.168.1.234/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/dns4/example.com/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr(`/ip4/${ip4v1}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }, {
      multiaddr: multiaddr(`/ip6/${ip6v1}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }])

    components.events.safeDispatchEvent('certificate:provision', {
      detail: {
        key: importFromPem(PRIVATE_KEY_PEM),
        cert: CERT
      }
    })

    expect(components.addressManager.addDNSMapping.calledWith('81-12-12-9.example.com', [
      ip4v1
    ])).to.be.true()
    expect(components.addressManager.addDNSMapping.calledWith('2001-4860-4860--8889.example.com', [
      ip6v1
    ])).to.be.true()

    const ip4v2 = '81.12.12.10'
    const ip6v2 = '2001:4860:4860::8890'

    components.addressManager.getAddressesWithMetadata.returns([{
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/ip4/192.168.1.234/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/dns4/example.com/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr(`/ip4/${ip4v2}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }, {
      multiaddr: multiaddr(`/ip6/${ip6v2}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }])

    components.events.safeDispatchEvent('self:peer:update', {
      detail: stubInterface<Peer>()
    })

    expect(components.addressManager.removeDNSMapping.calledWith('81-12-12-9.example.com')).to.be.true()
    expect(components.addressManager.removeDNSMapping.calledWith('2001-4860-4860--8889.example.com')).to.be.true()

    expect(components.addressManager.addDNSMapping.calledWith('81-12-12-10.example.com', [
      ip4v2
    ])).to.be.true()
    expect(components.addressManager.addDNSMapping.calledWith('2001-4860-4860--8890.example.com', [
      ip6v2
    ])).to.be.true()
  })

  it('should not map domains when no certificate is available', () => {
    const ip4 = '81.12.12.9'
    const ip6 = '2001:4860:4860::8889'

    components.addressManager.getAddressesWithMetadata.returns([{
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/ip4/192.168.1.234/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr('/dns4/example.com/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      verified: true,
      expires: Infinity,
      type: 'transport'
    }, {
      multiaddr: multiaddr(`/ip4/${ip4}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }, {
      multiaddr: multiaddr(`/ip6/${ip6}/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`),
      verified: true,
      expires: Infinity,
      type: 'ip-mapping'
    }])

    components.events.safeDispatchEvent('self:peer:update', {
      detail: stubInterface<Peer>()
    })

    expect(components.addressManager.addDNSMapping.called).to.be.false()
  })
})
