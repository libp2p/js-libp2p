import {
  Request,
  Response,
  DHTRequest,
  DHTResponse
} from '@libp2p/daemon-protocol'
import { CodeError } from '@libp2p/interface/errors'
import { isPeerId, type PeerId } from '@libp2p/interface/peer-id'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { CID } from 'multiformats/cid'
import type { DaemonClient } from './index.js'
import type { PeerInfo } from '@libp2p/interface/peer-info'

export class DHT {
  private readonly client: DaemonClient

  constructor (client: DaemonClient) {
    this.client = client
  }

  /**
   * Write a value to a key in the DHT
   */
  async put (key: Uint8Array, value: Uint8Array): Promise<void> {
    if (!(key instanceof Uint8Array)) {
      throw new CodeError('invalid key received', 'ERR_INVALID_KEY')
    }

    if (!(value instanceof Uint8Array)) {
      throw new CodeError('value received is not a Uint8Array', 'ERR_INVALID_VALUE')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.PUT_VALUE,
        key,
        value
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'DHT put failed', 'ERR_DHT_PUT_FAILED')
    }
  }

  /**
   * Query the DHT for a value stored at a key in the DHT
   */
  async get (key: Uint8Array): Promise<Uint8Array> {
    if (!(key instanceof Uint8Array)) {
      throw new CodeError('invalid key received', 'ERR_INVALID_KEY')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.GET_VALUE,
        key
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'DHT get failed', 'ERR_DHT_GET_FAILED')
    }

    if (response.dht == null || response.dht.value == null) {
      throw new CodeError('Invalid DHT get response', 'ERR_DHT_GET_FAILED')
    }

    return response.dht.value
  }

  /**
   * Query the DHT for a given peer's known addresses.
   */
  async findPeer (peerId: PeerId): Promise<PeerInfo> {
    if (!isPeerId(peerId)) {
      throw new CodeError('invalid peer id received', 'ERR_INVALID_PEER_ID')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.FIND_PEER,
        peer: peerId.toBytes()
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'DHT find peer failed', 'ERR_DHT_FIND_PEER_FAILED')
    }

    if (response.dht == null || response.dht.peer == null || response.dht.peer.addrs == null) {
      throw new CodeError('Invalid response', 'ERR_DHT_FIND_PEER_FAILED')
    }

    return {
      id: peerIdFromBytes(response.dht.peer.id),
      multiaddrs: response.dht.peer.addrs.map((a) => multiaddr(a)),
      protocols: []
    }
  }

  /**
   * Announce to the network that the peer have data addressed by the provided CID
   */
  async provide (cid: CID): Promise<void> {
    if (cid == null || CID.asCID(cid) == null) {
      throw new CodeError('invalid cid received', 'ERR_INVALID_CID')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.PROVIDE,
        cid: cid.bytes
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'DHT provide failed', 'ERR_DHT_PROVIDE_FAILED')
    }
  }

  /**
   * Query the DHT for peers that have a piece of content, identified by a CID
   */
  async * findProviders (cid: CID, count: number = 1): AsyncIterable<PeerInfo> {
    if (cid == null || CID.asCID(cid) == null) {
      throw new CodeError('invalid cid received', 'ERR_INVALID_CID')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.FIND_PROVIDERS,
        cid: cid.bytes,
        count
      }
    })

    let message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    // stream begin message
    const response = Response.decode(message)

    if (response.type !== Response.Type.OK) {
      await sh.close()
      throw new CodeError(response.error?.msg ?? 'DHT find providers failed', 'ERR_DHT_FIND_PROVIDERS_FAILED')
    }

    while (true) {
      message = await sh.read()

      if (message == null) {
        throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
      }

      const response = DHTResponse.decode(message)

      // Stream end
      if (response.type === DHTResponse.Type.END) {
        await sh.close()
        return
      }

      // Stream values
      if (response.type === DHTResponse.Type.VALUE && response.peer != null && response.peer?.addrs != null) {
        yield {
          id: peerIdFromBytes(response.peer.id),
          multiaddrs: response.peer.addrs.map((a) => multiaddr(a)),
          protocols: []
        }
      } else {
        // Unexpected message received
        await sh.close()
        throw new CodeError('unexpected message received', 'ERR_UNEXPECTED_MESSAGE_RECEIVED')
      }
    }
  }

  /**
   * Query the DHT routing table for peers that are closest to a provided key.
   */
  async * getClosestPeers (key: Uint8Array): AsyncIterable<PeerInfo> {
    if (!(key instanceof Uint8Array)) {
      throw new CodeError('invalid key received', 'ERR_INVALID_KEY')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.GET_CLOSEST_PEERS,
        key
      }
    })

    // stream begin message
    let message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    if (response.type !== Response.Type.OK) {
      await sh.close()
      throw new CodeError(response.error?.msg ?? 'DHT find providers failed', 'ERR_DHT_FIND_PROVIDERS_FAILED')
    }

    while (true) {
      message = await sh.read()

      if (message == null) {
        throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
      }

      const response = DHTResponse.decode(message)

      // Stream end
      if (response.type === DHTResponse.Type.END) {
        await sh.close()
        return
      }

      // Stream values
      if (response.type === DHTResponse.Type.VALUE && response.value != null) {
        const peerId = peerIdFromBytes(response.value)

        yield {
          id: peerId,
          multiaddrs: [],
          protocols: []
        }
      } else {
        // Unexpected message received
        await sh.close()
        throw new CodeError('unexpected message received', 'ERR_UNEXPECTED_MESSAGE_RECEIVED')
      }
    }
  }

  /**
   * Query the DHT routing table for a given peer's public key.
   */
  async getPublicKey (peerId: PeerId): Promise<Uint8Array | undefined> {
    if (!isPeerId(peerId)) {
      throw new CodeError('invalid peer id received', 'ERR_INVALID_PEER_ID')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.GET_PUBLIC_KEY,
        peer: peerId.toBytes()
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'DHT get public key failed', 'ERR_DHT_GET_PUBLIC_KEY_FAILED')
    }

    if (response.dht == null) {
      throw new CodeError('Invalid response', 'ERR_DHT_GET_PUBLIC_KEY_FAILED')
    }

    return response.dht.value
  }
}
