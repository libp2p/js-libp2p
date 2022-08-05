import * as sdp from './sdp';
import * as p from '@libp2p/peer-id';
import { WebRTCConnection } from './connection';
import { WebRTCDialOptions } from './options';
import { Components } from '@libp2p/components';
import { Connection } from '@libp2p/interface-connection';
import { CreateListenerOptions, DialOptions, Listener, symbol, Transport } from '@libp2p/interface-transport';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import { v4 as genUuid } from 'uuid';
import { Noise, stablelib } from '@chainsafe/libp2p-noise';
import { WebRTCStream } from './stream';

const log = logger('libp2p:webrtc:transport');
const utf8 = new TextEncoder();

export class WebRTCTransport implements Transport {
  private components: Components = new Components();

  async dial(ma: Multiaddr, options: DialOptions): Promise<Connection> {
    const rawConn = this._connect(ma, options);
    log('new outbound connection %s', rawConn, genUuid());
    throw new Error('not implemented');
  }

  createListener(options: CreateListenerOptions): Listener {
    throw new Error('TODO - replace with an exception more appropriate to the fact that this will not be implemented.');
  }

  filter(multiaddrs: Multiaddr[]): Multiaddr[] {
    return [];
  }

  get [Symbol.toStringTag](): string {
    return '@libp2p/webrtc';
  }

  get [symbol](): true {
    return true;
  }

  async _connect(ma: Multiaddr, options: WebRTCDialOptions) {
    let peerConnection = new RTCPeerConnection();
    // create data channel
    let handshakeDataChannel = peerConnection.createDataChannel('data', { negotiated: true, id: 1 });
    // let handshakeChannel = peerConnection.createDataChannel("data", { id: 1 })
    //
    //
    // create offer sdp
    let offerSdp = await peerConnection.createOffer();
    console.log(offerSdp);
    //
    //
    // generate random string for ufrag
    let ufrag = genUuid();
    //
    //
    // munge sdp with ufrag = pwd
    offerSdp = sdp.munge(offerSdp, ufrag);
    //
    //
    // set local description
    peerConnection.setLocalDescription(offerSdp);
    //
    //
    // construct answer sdp from multiaddr
    let answerSdp = sdp.fromMultiAddr(ma, ufrag);
    //
    //
    //
    // set remote description
    peerConnection.setRemoteDescription(answerSdp);
    //
    //
    //
    // wait for peerconnection.onopen to fire, or for the datachannel to open
    let openPromise = new Promise((res, rej) => {
      handshakeDataChannel.onopen = res;
      setTimeout(rej, 10000);
    });
    await openPromise;

    let myPeerId = this.components.getPeerId();
    let rps = ma.getPeerId();
    if (!rps) {
      throw new Error('TODO Do we really need a peer ID ?');
    }
    let theirPeerId = p.peerIdFromString(rps);

    // do noise handshake
    //set the Noise Prologue to libp2p-webrtc-noise:<FINGERPRINTS> before starting the actual Noise handshake.
    //  <FINGERPRINTS> is the concatenation of the of the two TLS fingerprints of A and B in their multihash byte representation, sorted in ascending order.
    let fingerprintsPrologue = [myPeerId.multihash, theirPeerId.multihash].sort().join('');
    let noise = new Noise(myPeerId.privateKey, undefined, stablelib, utf8.encode(fingerprintsPrologue));
    let wrappedChannel = new WebRTCStream({ channel: handshakeDataChannel, direction: 'outbound' });
    await noise.secureOutbound(myPeerId, wrappedChannel, theirPeerId);

    return new WebRTCConnection({
      id: ma.toString(),
      remoteAddr: ma,
      localPeer: myPeerId,
      direction: 'outbound',
      pc: peerConnection,
      credential_string: ufrag,
      remotePeerId: theirPeerId,
    });
  }
}
