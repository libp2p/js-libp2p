import { memory } from '@libp2p/memory'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { createLibp2p } from 'libp2p'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import type { ConnectionGater, Libp2p, PeerId } from '@libp2p/interface'

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

describe('connection-gater with arrow function properties', () => {
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

describe('connection-gater with class methods', () => {
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
    class TestGater implements ConnectionGater {
      denyDialPeer (peerId: PeerId): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyDialPeerStub = Sinon.spy(connectionGater, 'denyDialPeer')

    localNode = await createLocalNode(connectionGater)

    const ma = multiaddr(`/memory/1/p2p/${remoteNode.peerId}`)

    await expect(localNode.dial(ma)).to.eventually.be.rejected
      .with.property('name', 'DialDeniedError')

    expect(denyDialPeerStub.called).to.be.true()
    expect(denyDialPeerStub.getCall(0).args[0]).to.deep.equal(
      remoteNode.peerId
    )
  })

  it('should deny dialling a multiaddr', async () => {
    class TestGater implements ConnectionGater {
      denyDialMultiaddr? (multiaddr: any): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyDialMultiaddrStub = Sinon.spy(connectionGater, 'denyDialMultiaddr')

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'DialDeniedError')

    expect(denyDialMultiaddrStub.called).to.be.true()
  })

  it('should deny an inbound connection', async () => {
    class TestGater implements ConnectionGater {
      denyInboundConnection? (maConn: any): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyInboundConnectionStub = Sinon.spy(connectionGater, 'denyInboundConnection')

    localNode = await createLocalNode(connectionGater)

    await expect(remoteNode.dial(localNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')

    expect(denyInboundConnectionStub.called).to.be.true()
  })

  it('should deny an outbound connection', async () => {
    class TestGater implements ConnectionGater {
      denyOutboundConnection? (peerId: PeerId, maConn: any): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyOutboundConnectionStub = Sinon.spy(connectionGater, 'denyOutboundConnection')

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs(), {
      signal: AbortSignal.timeout(10_000)
    })).to.eventually.be.rejected
      .with.property('name', 'ConnectionInterceptedError')

    expect(denyOutboundConnectionStub.called).to.be.true()
  })

  it('should deny an inbound encrypted connection', async () => {
    class TestGater implements ConnectionGater {
      denyInboundEncryptedConnection? (peerId: PeerId, maConn: any): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyInboundEncryptedConnectionStub = Sinon.spy(connectionGater, 'denyInboundEncryptedConnection')

    localNode = await createLocalNode(connectionGater)

    await expect(remoteNode.dial(localNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')

    expect(denyInboundEncryptedConnectionStub.called).to.be.true()
  })

  it('should deny an outbound encrypted connection', async () => {
    class TestGater implements ConnectionGater {
      denyOutboundEncryptedConnection? (peerId: PeerId, maConn: any): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyOutboundEncryptedConnectionStub = Sinon.spy(connectionGater, 'denyOutboundEncryptedConnection')

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'ConnectionInterceptedError')

    expect(denyOutboundEncryptedConnectionStub.called).to.be.true()
  })

  it('should deny an inbound upgraded connection', async () => {
    class TestGater implements ConnectionGater {
      denyInboundUpgradedConnection? (peerId: PeerId, maConn: any): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyInboundUpgradedConnectionStub = Sinon.spy(connectionGater, 'denyInboundUpgradedConnection')

    localNode = await createLocalNode(connectionGater)

    remoteNode.dial(localNode.getMultiaddrs()).catch(() => {})

    await delay(100)

    expect(localNode.getConnections()).to.be.empty()
    expect(denyInboundUpgradedConnectionStub.called).to.be.true()
  })

  it('should deny an outbound upgraded connection', async () => {
    class TestGater implements ConnectionGater {
      denyOutboundUpgradedConnection? (peerId: PeerId, maConn: any): boolean {
        return true
      }
    }

    const connectionGater = new TestGater()
    const denyOutboundUpgradedConnectionStub = Sinon.spy(connectionGater, 'denyOutboundUpgradedConnection')

    localNode = await createLocalNode(connectionGater)

    await expect(localNode.dial(remoteNode.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'ConnectionInterceptedError')

    expect(denyOutboundUpgradedConnectionStub.called).to.be.true()
  })
})
