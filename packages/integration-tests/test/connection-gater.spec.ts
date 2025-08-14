import { memory } from '@libp2p/memory'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { createLibp2p } from 'libp2p'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import type { ConnectionGater, Libp2p } from '@libp2p/interface'

async function createLocalNode (connectionGater: ConnectionGater): Promise<Libp2p> {
  return createLibp2p({
    connectionGater,
    addresses: {
      listen: [
        '/memory/0'
      ]
    },
    transports: [
      memory()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    streamMuxers: [
      mplex()
    ]
  })
}

describe('connection-gater', () => {
  let localNode: Libp2p
  let remoteNode: Libp2p

  beforeEach(async () => {
    remoteNode = await createLibp2p({
      addresses: {
        listen: [
          '/memory/1'
        ]
      },
      transports: [
        memory()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      streamMuxers: [
        mplex()
      ]
    })
  })

  afterEach(async () => {
    await localNode?.stop()
    await remoteNode?.stop()
  })

  it('should deny dialling a peer', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyDialPeer: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    const ma = multiaddr(`/memory/1/p2p/${remoteNode.peerId}`)

    await expect(localNode.dial(ma)).to.eventually.be.rejected
      .with.property('name', 'DialDeniedError')

    expect(connectionGater.denyDialPeer?.called).to.be.true()
    expect(connectionGater.denyDialPeer?.getCall(0).args[0]).to.deep.equal(remoteNode.peerId)
  })

  it('should deny dialling a multiaddr', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyDialMultiaddr: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'DialDeniedError')

    expect(connectionGater.denyDialMultiaddr?.called).to.be.true()
  })

  it('should deny an inbound connection', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyInboundConnection: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    await expect(remoteNode.dial(localNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')

    expect(connectionGater.denyInboundConnection?.called).to.be.true()
  })

  it('should deny an outbound connection', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyOutboundConnection: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs(), {
      signal: AbortSignal.timeout(10_000)
    })).to.eventually.be.rejected
      .with.property('name', 'ConnectionInterceptedError')

    expect(connectionGater.denyOutboundConnection?.called).to.be.true()
  })

  it('should deny an inbound encrypted connection', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyInboundEncryptedConnection: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    await expect(remoteNode.dial(localNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')

    expect(connectionGater.denyInboundEncryptedConnection?.called).to.be.true()
  })

  it('should deny an outbound encrypted connection', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyOutboundEncryptedConnection: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'ConnectionInterceptedError')

    expect(connectionGater.denyOutboundEncryptedConnection?.called).to.be.true()
  })

  it('should deny an inbound upgraded connection', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyInboundUpgradedConnection: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    await remoteNode.dial(localNode.getMultiaddrs())

    await delay(100)

    expect(localNode.getConnections()).to.be.empty()
    expect(connectionGater.denyInboundUpgradedConnection?.called).to.be.true()
  })

  it('should deny an outbound upgraded connection', async () => {
    const connectionGater = stubInterface<ConnectionGater>({
      denyOutboundUpgradedConnection: Sinon.stub<any>().returns(true)
    })

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'ConnectionInterceptedError')

    expect(connectionGater.denyOutboundUpgradedConnection?.called).to.be.true()
  })
})
