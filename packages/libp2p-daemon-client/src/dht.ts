import {
  Request,
  Response,
  DHTRequest,
  DHTResponse
} from '@libp2p/daemon-protocol'
import { InvalidMessageError, InvalidParametersError, ProtocolError, isPeerId } from '@libp2p/interface'
import { logger } from '@libp2p/logger'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import { OperationFailedError } from './index.js'
import type { DaemonClient } from './index.js'
import type { PeerId, PeerInfo } from '@libp2p/interface'

const log = logger('libp2p:daemon-client:dht')

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
      throw new InvalidParametersError('invalid key received')
    }

    if (!(value instanceof Uint8Array)) {
      throw new InvalidParametersError('value received is not a Uint8Array')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.PUT_VALUE,
        key,
        value
      }
    })

    const response = await sh.read(Response)

    log('read', response)

    await sh.unwrap().close()

    if (response.type !== Response.Type.OK) {
      throw new ProtocolError(response.error?.msg ?? 'DHT put failed')
    }
  }

  /**
   * Query the DHT for a value stored at a key in the DHT
   */
  async get (key: Uint8Array): Promise<Uint8Array> {
    if (!(key instanceof Uint8Array)) {
      throw new InvalidParametersError('invalid key received')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.GET_VALUE,
        key
      }
    })

    const response = await sh.read(Response)

    await sh.unwrap().close()

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'DHT get failed')
    }

    if (response.dht?.value == null) {
      throw new OperationFailedError('Invalid DHT get response')
    }

    return response.dht.value
  }

  /**
   * Query the DHT for a given peer's known addresses.
   */
  async findPeer (peerId: PeerId): Promise<PeerInfo> {
    if (!isPeerId(peerId)) {
      throw new InvalidParametersError('invalid peer id received')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.FIND_PEER,
        peer: peerId.toMultihash().bytes
      }
    })

    const response = await sh.read(Response)

    await sh.unwrap().close()

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'DHT find peer failed')
    }

    if (response.dht?.peer?.addrs == null) {
      throw new OperationFailedError('Invalid response')
    }

    return {
      id: peerIdFromMultihash(Digest.decode(response.dht.peer.id)),
      multiaddrs: response.dht.peer.addrs.map((a) => multiaddr(a))
    }
  }

  /**
   * Announce to the network that the peer have data addressed by the provided CID
   */
  async provide (cid: CID): Promise<void> {
    if (cid == null || CID.asCID(cid) == null) {
      throw new InvalidParametersError('invalid cid received')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.PROVIDE,
        cid: cid.bytes
      }
    })

    const response = await sh.read(Response)

    await sh.unwrap().close()

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'DHT provide failed')
    }
  }

  /**
   * Query the DHT for peers that have a piece of content, identified by a CID
   */
  async * findProviders (cid: CID, count: number = 1): AsyncIterable<PeerInfo> {
    if (cid == null || CID.asCID(cid) == null) {
      throw new InvalidParametersError('invalid cid received')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.FIND_PROVIDERS,
        cid: cid.bytes,
        count
      }
    })

    // stream begin message
    const response = await sh.read(Response)

    if (response.type !== Response.Type.OK) {
      await sh.unwrap().close()
      throw new OperationFailedError(response.error?.msg ?? 'DHT find providers failed')
    }

    while (true) {
      const dhtResponse = await sh.read(DHTResponse)

      // Stream end
      if (dhtResponse.type === DHTResponse.Type.END) {
        await sh.unwrap().close()
        return
      }

      // Stream values
      if (dhtResponse.type === DHTResponse.Type.VALUE && dhtResponse.peer?.addrs != null) {
        yield {
          id: peerIdFromMultihash(Digest.decode(dhtResponse.peer.id)),
          multiaddrs: dhtResponse.peer.addrs.map((a) => multiaddr(a))
        }
      } else {
        // Unexpected message received
        await sh.unwrap().close()
        throw new ProtocolError('unexpected message received')
      }
    }
  }

  /**
   * Query the DHT routing table for peers that are closest to a provided key.
   */
  async * getClosestPeers (key: Uint8Array): AsyncIterable<PeerInfo> {
    if (!(key instanceof Uint8Array)) {
      throw new InvalidParametersError('invalid key received')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.GET_CLOSEST_PEERS,
        key
      }
    })

    // stream begin message
    const response = await sh.read(Response)

    if (response.type !== Response.Type.OK) {
      await sh.unwrap().close()
      throw new OperationFailedError(response.error?.msg ?? 'DHT find providers failed')
    }

    while (true) {
      const dhtResponse = await sh.read(DHTResponse)

      // Stream end
      if (dhtResponse.type === DHTResponse.Type.END) {
        await sh.unwrap().close()
        return
      }

      // Stream values
      if (dhtResponse.type === DHTResponse.Type.VALUE && dhtResponse.value != null) {
        const peerId = peerIdFromMultihash(Digest.decode(dhtResponse.value))

        yield {
          id: peerId,
          multiaddrs: []
        }
      } else {
        // Unexpected message received
        await sh.unwrap().close()
        throw new InvalidMessageError('unexpected message received')
      }
    }
  }

  /**
   * Query the DHT routing table for a given peer's public key.
   */
  async getPublicKey (peerId: PeerId): Promise<Uint8Array | undefined> {
    if (!isPeerId(peerId)) {
      throw new InvalidParametersError('invalid peer id received')
    }

    const sh = await this.client.send({
      type: Request.Type.DHT,
      dht: {
        type: DHTRequest.Type.GET_PUBLIC_KEY,
        peer: peerId.toMultihash().bytes
      }
    })

    const response = await sh.read(Response)

    await sh.unwrap().close()

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'DHT get public key failed')
    }

    if (response.dht == null) {
      throw new InvalidMessageError('Invalid response')
    }

    return response.dht.value
  }
}
