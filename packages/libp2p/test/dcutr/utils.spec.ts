/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { isPublicAndDialable } from '../../src/dcutr/utils.js'
import type { Transport } from '@libp2p/interface/transport'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

describe('dcutr utils', () => {
  describe('isPublicAndDialable', () => {
    const testCases = {
      // good addresses
      '/ip4/123.123.123.123/tcp/80/p2p/12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa': true,
      '/dnsaddr/example.com/p2p/12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa': true,
      '/ip4/123.123.123.123/tcp/80/p2p/12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa/p2p-circuit/webrtc/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN': true,

      // bad addresses
      '/dnsaddr/example.com/p2p/12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa/p2p-circuit/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN': false,
      '/ip4/10.0.0.1/tcp/123/p2p/12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa': false
    }

    for (const [key, value] of Object.entries(testCases)) {
      it(`should ${value ? '' : 'not '}allow ${key}`, () => {
        const transportManager = stubInterface<TransportManager>({
          transportForMultiaddr: stubInterface<Transport>()
        })

        expect(isPublicAndDialable(multiaddr(key), transportManager)).to.equal(value)
      })
    }

    it('should not allow addresses for which there is no transport', () => {
      const transportManager = stubInterface<TransportManager>()

      expect(isPublicAndDialable(multiaddr('/ip4/123.123.123.123/p2p/12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa'), transportManager)).to.be.false()
    })
  })
})
