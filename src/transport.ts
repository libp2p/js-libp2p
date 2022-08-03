import * as sdp from './sdp';
import { WebRTCConnection } from './connection';
import { WebRTCDialOptions } from './options';
import { Components } from '@libp2p/components';
import { Connection } from '@libp2p/interface-connection';
import { CreateListenerOptions, DialOptions, Listener, symbol, Transport } from '@libp2p/interface-transport';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import { v4 as genUuid } from 'uuid';

const log = logger('libp2p:webrtc:transport');

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
    let handshakeChannel = peerConnection.createDataChannel('data', { negotiated: true, id: 1 });
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
      handshakeChannel.onopen = res;
      setTimeout(rej, 10000);
    });
    await openPromise;

    // TODO TODO !!
    // do noise handshake + webrtc handshake as described in spec
    //

    return new WebRTCConnection({
      id: 'TODO',
      remoteAddr: ma,
      localPeer: this.components.getPeerId(),
      direction: 'outbound',
      pc: peerConnection,
      credential_string: ufrag,
    });
  }
}
