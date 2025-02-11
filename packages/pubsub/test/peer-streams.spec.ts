import { generateKeyPair } from '@libp2p/crypto/keys'
import { type PeerId } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { Uint8ArrayList } from 'uint8arraylist'
import { PeerStreams } from '../src/peer-streams.js'
import { ConnectionPair } from './utils/index.js'

describe('PeerStreams large message handling', () => {
  let otherPeerId: PeerId

  beforeEach(async () => {
    otherPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  it('should receive messages larger than MAX_DATA_LENGTH when maxDataLength is set', async () => {
    const messageSize = 6 * 1024 * 1024 // 6MB
    const largeMessage = new Uint8ArrayList(new Uint8Array(messageSize).fill(65)) // Fill with "A"

    // Get both ends of the duplex stream
    const [connA, connB] = ConnectionPair()

    // Use connB as the inbound (reading) side
    const inboundStream = await connB.newStream(['a-protocol'])
    // Use connA as the outbound (writing) side
    const outboundStream = await connA.newStream(['a-protocol'])

    // Create PeerStreams with increased maxDataLength
    const peer = new PeerStreams(
      { logger: defaultLogger() },
      { id: otherPeerId, protocol: 'a-protocol' }
    )

    // Attach the inbound stream on the reading end
    const inbound = peer.attachInboundStream(inboundStream, { maxDataLength: messageSize })

    // Simulate sending data from the outbound side
    await pipe(
      [largeMessage],
      (source) => lp.encode(source, { maxDataLength: messageSize }),
      async function * (source) {
        for await (const chunk of source) {
          yield chunk
        }
      },
      outboundStream.sink
    )

    // Close the outbound writer so the reader knows no more data is coming
    await outboundStream.closeWrite()

    // Collect received messages
    const receivedMessages: Uint8ArrayList[] = []
    for await (const msg of inbound) {
      receivedMessages.push(msg)
    }

    // Check if received correctly
    expect(receivedMessages).to.have.lengthOf(1)
    expect(receivedMessages[0].byteLength).to.equal(messageSize)
    // Check that the content of the sent and received messages are identical
    // expect(receivedMessages[0].slice()).to.eql(largeMessage.slice())
    const data = receivedMessages[0].slice()
    const input = largeMessage.slice()
    expect(data.length).to.equal(input.length)
    expect(data).to.deep.equal(input)
  })
})
