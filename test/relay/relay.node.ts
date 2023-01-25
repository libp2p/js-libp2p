import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { pipe } from 'it-pipe'
import { pEvent } from 'p-event'
import * as sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { RELAY_V2_HOP_CODEC } from '../../src/circuit/multicodec.js'
import { CircuitRelay } from '../../src/circuit/v1/pb/index.js'
import { HopMessage } from '../../src/circuit/v2/pb/index.js'
import { StreamHandlerV2 } from '../../src/circuit/v2/stream-handler.js'
import { codes as Errors } from '../../src/errors.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import { createNode } from '../utils/creators/peer.js'
import { createNodeOptions, createRelayOptions } from './utils.js'
import all from 'it-all'
// import delay from 'delay'

/* eslint-env mocha */

describe('Dialing (via relay, TCP)', () => {
  let srcLibp2p: Libp2pNode
  let relayLibp2p: Libp2pNode
  let dstLibp2p: Libp2pNode

  beforeEach(async () => {
    // Create 3 nodes, and turn HOP on for the relay
    [srcLibp2p, relayLibp2p, dstLibp2p] = await Promise.all([
      createNode({
        config: createNodeOptions({
          relay: {
            autoRelay: {
              enabled: false
            }
          }
        })
      }),
      createNode({
        config: createRelayOptions({
          relay: {
            autoRelay: {
              enabled: false
            }
          }
        })
      }),
      createNode({
        config: createNodeOptions({
          relay: {
            autoRelay: {
              enabled: true
            }
          }
        })
      })
    ])

    await dstLibp2p.handle('/echo/1.0.0', ({ stream }) => {
      void pipe(stream, stream)
    })

    // Start each node
    await Promise.all([srcLibp2p, relayLibp2p, dstLibp2p].map(async libp2p => await libp2p.start()))
  })

  afterEach(async () => {
    // Stop each node
    return await Promise.all([srcLibp2p, relayLibp2p, dstLibp2p].map(async libp2p => await libp2p.stop()))
  })

  it('should be able to connect to a peer over a relay with active connections', async () => {
    const relayAddr = relayLibp2p.components.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerId.toString()

    await dstLibp2p.dial(relayAddr.encapsulate(`/p2p/${relayIdString}`))
    // make sure we have reservation before trying to dial. Previously relay initiated connection.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await pEvent(dstLibp2p.circuitService!, 'relay:reservation')
    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toString()}`)

    const connection = await srcLibp2p.dial(dialAddr)

    expect(connection).to.exist()
    expect(connection.remotePeer.toBytes()).to.eql(dstLibp2p.peerId.toBytes())
    expect(connection.remoteAddr).to.eql(dialAddr)

    const echoStream = await connection.newStream('/echo/1.0.0')

    const input = uint8ArrayFromString('hello')
    const [output] = await pipe(
      [input],
      echoStream,
      async (source) => await all(source)
    )

    expect(output.slice()).to.eql(input)
    echoStream.close()
  })

  it('should fail to connect to a peer over a relay with inactive connections', async () => {
    const relayAddr = relayLibp2p.components.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerId.toString()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toString()}`)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejected()
      .and.to.have.nested.property('.errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)
  })

  it('should not stay connected to a relay when not already connected and HOP fails', async () => {
    const relayAddr = relayLibp2p.components.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerId.toString()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toString()}`)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejected()
      .and.to.have.nested.property('.errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    // We should not be connected to the relay, because we weren't before the dial
    const srcToRelayConns = srcLibp2p.components.connectionManager.getConnections(relayLibp2p.peerId)
    expect(srcToRelayConns).to.be.empty()
  })

  it('dialer should stay connected to an already connected relay on hop failure', async () => {
    const relayIdString = relayLibp2p.peerId.toString()
    const relayAddr = relayLibp2p.components.transportManager.getAddrs()[0].encapsulate(`/p2p/${relayIdString}`)

    const dialAddr = relayAddr
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toString()}`)

    await srcLibp2p.dial(relayAddr)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejected()
      .and.to.have.nested.property('.errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    const srcToRelayConn = srcLibp2p.components.connectionManager.getConnections(relayLibp2p.peerId)
    expect(srcToRelayConn).to.have.lengthOf(1)
    expect(srcToRelayConn).to.have.nested.property('[0].stat.status', 'OPEN')
  })

  it('destination peer should stay connected to an already connected relay on hop failure', async () => {
    const relayIdString = relayLibp2p.peerId.toString()
    const relayAddr = relayLibp2p.components.transportManager.getAddrs()[0].encapsulate(`/p2p/${relayIdString}`)

    const dialAddr = relayAddr
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toString()}`)

    // Connect the destination peer and the relay
    const tcpAddrs = dstLibp2p.components.transportManager.getAddrs()
    sinon.stub(dstLibp2p.components.addressManager, 'getListenAddrs').returns([multiaddr(`${relayAddr.toString()}/p2p-circuit`)])

    await dstLibp2p.components.transportManager.listen(dstLibp2p.components.addressManager.getListenAddrs())
    expect(dstLibp2p.components.transportManager.getAddrs()).to.have.deep.members([...tcpAddrs, dialAddr.decapsulate('p2p')])

    // send an invalid relay message from the relay to the destination peer
    const connections = relayLibp2p.getConnections(dstLibp2p.peerId)
    const stream = await connections[0].newStream(RELAY_V2_HOP_CODEC)
    const streamHandler = new StreamHandlerV2({ stream })
    // empty messages are encoded as { type: RESERVE } for the hop codec,
    // so we make the message invalid by adding a zeroed byte
    streamHandler.write(new Uint8Array([0]))
    const res = HopMessage.decode(await streamHandler.read())
    expect(res?.status).to.equal(CircuitRelay.Status.MALFORMED_MESSAGE)
    streamHandler.close()

    // should still be connected
    const dstToRelayConn = dstLibp2p.components.connectionManager.getConnections(relayLibp2p.peerId)
    expect(dstToRelayConn).to.have.lengthOf(1)
    expect(dstToRelayConn).to.have.nested.property('[0].stat.status', 'OPEN')
  })

  /* eslint-disable-next-line no-warning-comments */
  // TODO(ckousik): This test seems to fail on windows and macos on CI with a
  // stream reset in mplex.
  it.skip('should time out when establishing a relay connection', async () => {
    await relayLibp2p.stop()
    relayLibp2p = await createNode({
      config: createRelayOptions({
        relay: {
          enabled: true,
          hop: {
            // very short timeout
            timeout: 5
          }
        }
      })
    })

    const relayAddr = relayLibp2p.components.transportManager.getAddrs()[0]
    const dialAddr = relayAddr.encapsulate(`/p2p/${relayLibp2p.peerId.toString()}`)

    const connection = await srcLibp2p.dial(dialAddr)
    // this should succeed as the timeout is only effective after
    // multistream select negotiates the protocol
    const stream = await connection.newStream([RELAY_V2_HOP_CODEC])

    /* eslint-disable-next-line no-warning-comments */
    // TODO(ckousik): does this need to be awaited?
    // await stream.sink(async function * () {
    //   // delay for longer than the timeout
    //   await delay(1000)
    //   yield Uint8Array.from([0])
    // }())

    // because we timed out, the remote should have reset the stream
    await expect(all(stream.source)).to.eventually.be.rejected
      .with.property('code', 'ERR_STREAM_RESET')
  })
})
