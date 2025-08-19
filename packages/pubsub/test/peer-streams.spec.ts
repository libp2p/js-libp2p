import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { raceEvent } from 'race-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { PeerStreams } from '../src/peer-streams.js'
import { connectionPair } from './utils/index.js'
import type { PeerId } from '@libp2p/interface'

describe('peer-streams', () => {
  let localPeerId: PeerId
  let remotePeerId: PeerId

  beforeEach(async () => {
    localPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  it('should receive messages larger than internal MAX_DATA_LENGTH when maxDataLength is set', async () => {
    const messageSize = 6 * 1024 * 1024 // 6MB
    const largeMessage = new Uint8ArrayList(new Uint8Array(messageSize).fill(65)) // Fill with "A"

    // Get both ends of the duplex stream
    const [connA, connB] = await connectionPair(localPeerId, remotePeerId)

    // Use connB as the inbound (reading) side
    const inboundStream = await connB.newStream(['a-protocol'])
    // Use connA as the outbound (writing) side
    const outboundStream = await connA.newStream(['a-protocol'])

    // Create PeerStreams with increased maxDataLength
    const peer = new PeerStreams(
      { logger: defaultLogger() },
      { id: remotePeerId, protocol: 'a-protocol' }
    )

    // Attach the inbound stream on the reading end
    const inbound = peer.attachInboundStream(inboundStream, { maxDataLength: messageSize })

    // Simulate sending data from the outbound side
    await pipe(
      [largeMessage],
      (source) => lp.encode(source, { maxDataLength: messageSize }),
      async (source) => {
        for (const buf of source) {
          const sendMore = outboundStream.send(buf)

          if (sendMore === false) {
            await raceEvent(outboundStream, 'drain')
          }
        }
      }
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
    const data = receivedMessages[0].slice()
    const input = largeMessage.slice()
    expect(data.length).to.equal(input.length)
    expect(data).to.deep.equal(input)
  })
})
