import * as ic from '@libp2p/interface-connection'
import { createEd25519PeerId } from '@libp2p/peer-id-factory';

export async function createConnection(pc: RTCPeerConnection, direction: ic.Direction) {
  let peerId = await createEd25519PeerId();
}
