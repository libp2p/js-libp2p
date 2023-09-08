/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { publicAddressesFirst, certifiedAddressesFirst, circuitRelayAddressesLast, defaultAddressSort } from '../src/address-sort.js'

describe('address-sort', () => {
  describe('public addresses first', () => {
    it('should sort public addresses first', () => {
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const privateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000'),
        isCertified: false
      }

      const addresses = [
        privateAddress,
        publicAddress
      ]

      const sortedAddresses = addresses.sort(publicAddressesFirst)
      expect(sortedAddresses).to.deep.equal([
        publicAddress,
        privateAddress
      ])
    })
  })

  describe('certified addresses first', () => {
    it('should sort certified addresses first', () => {
      const certifiedPublicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4001'),
        isCertified: true
      }
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const certifiedPrivateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }
      const privateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000'),
        isCertified: false
      }

      const addresses = [
        publicAddress,
        certifiedPublicAddress,
        certifiedPrivateAddress,
        privateAddress
      ]

      const sortedAddresses = addresses.sort(certifiedAddressesFirst)
      expect(sortedAddresses).to.deep.equal([
        certifiedPublicAddress,
        certifiedPrivateAddress,
        publicAddress,
        privateAddress
      ])
    })
  })

  describe('circuit relay addresses last', () => {
    it('should sort circuit relay addresses last', () => {
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const publicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }

      const addresses = [
        publicRelay,
        publicAddress
      ]

      const sortedAddresses = addresses.sort(circuitRelayAddressesLast)
      expect(sortedAddresses).to.deep.equal([
        publicAddress,
        publicRelay
      ])
    })
  })

  describe('default address sort', () => {
    it('should sort public, then public relay, then private, then private relay with certified addresses taking priority', () => {
      const certifiedPublicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4001'),
        isCertified: true
      }
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const certifiedPublicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: true
      }
      const publicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }
      const certifiedPrivateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }
      const privateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000'),
        isCertified: false
      }
      const certifiedPrivateRelay = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: true
      }
      const privateRelay = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }

      const addresses = [
        privateAddress,
        certifiedPrivateAddress,
        publicRelay,
        certifiedPublicRelay,
        privateRelay,
        publicAddress,
        certifiedPublicAddress,
        certifiedPrivateRelay
      ].sort(() => {
        return Math.random() > 0.5 ? -1 : 1
      })

      const sortedAddresses = addresses.sort(defaultAddressSort)
      expect(sortedAddresses).to.deep.equal([
        certifiedPublicAddress,
        publicAddress,
        certifiedPublicRelay,
        publicRelay,
        certifiedPrivateAddress,
        privateAddress,
        certifiedPrivateRelay,
        privateRelay
      ])
    })

    it('should sort WebRTC over relay addresses before relay addresses', () => {
      const publicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }
      const webRTCOverRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm/webrtc'),
        isCertified: false
      }

      const addresses = [
        publicRelay,
        webRTCOverRelay
      ].sort(() => {
        return Math.random() > 0.5 ? -1 : 1
      })

      const sortedAddresses = addresses.sort(defaultAddressSort)
      expect(sortedAddresses).to.deep.equal([
        webRTCOverRelay,
        publicRelay
      ])
    })
  })
})
