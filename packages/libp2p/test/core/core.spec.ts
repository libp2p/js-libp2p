import { generateKeyPair } from '@libp2p/crypto/keys'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { createLibp2p, createLibp2pSync, isLibp2p } from '../../src/index.ts'
import type { Libp2p, Transport } from '@libp2p/interface'

describe('core', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should start a minimal node', async () => {
    libp2p = await createLibp2p()

    expect(libp2p).to.have.property('status', 'started')
  })

  it('should synchronously create a node', async () => {
    libp2p = createLibp2pSync({
      start: false
    })

    expect(() => libp2p.peerId).to.throw()
      .with.property('name', 'NotStartedError')

    await libp2p.start()

    expect(libp2p.peerId).to.be.ok()
  })

  it('should make a peer id available immediately if a private key is passed', async () => {
    const privateKey = await generateKeyPair('Ed25519')

    libp2p = createLibp2pSync({
      privateKey,
      start: false
    })

    expect(libp2p.peerId).to.be.ok()
  })

  it('should detect the libp2p type', async () => {
    libp2p = await createLibp2p()

    expect(isLibp2p(libp2p)).to.be.true()
  })

  it('should not detect the libp2p type', async () => {
    expect(isLibp2p({})).to.be.false()
    expect(isLibp2p()).to.be.false()
    expect(isLibp2p(null)).to.be.false()
    expect(isLibp2p(undefined)).to.be.false()
  })

  it('should say an address is not dialable if we have no transport for it', async () => {
    libp2p = await createLibp2p()

    const ma = multiaddr('/dns4/example.com/sctp/1234')

    await expect(libp2p.isDialable(ma)).to.eventually.be.false()
  })

  it('should test if a protocol can run over a limited connection', async () => {
    libp2p = await createLibp2p({
      transports: [
        () => {
          // stub a transport that can dial any address
          return stubInterface<Transport>({
            dialFilter: (addrs) => addrs
          })
        }
      ]
    })

    await expect(libp2p.isDialable(multiaddr('/dns4/example.com/tls/ws'), {
      runOnLimitedConnection: false
    })).to.eventually.be.true('could not dial memory address')

    await expect(libp2p.isDialable(multiaddr('/dns4/example.com/tls/ws/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE1/p2p-circuit/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE2'), {
      runOnLimitedConnection: true
    })).to.eventually.be.true('could not circuit relay address')

    await expect(libp2p.isDialable(multiaddr('/dns4/example.com/tls/ws/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE1/p2p-circuit/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE2'), {
      runOnLimitedConnection: false
    })).to.eventually.be.false('could dial circuit address')
  })
})
