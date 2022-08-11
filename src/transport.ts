import * as sdp from './sdp';
import * as p from '@libp2p/peer-id';
import { WebRTCConnection } from './connection';
import { WebRTCDialOptions } from './options';
import { WebRTCStream } from './stream';
import { Noise, stablelib } from '@chainsafe/libp2p-noise';
import { Components, Initializable } from '@libp2p/components';
import { Connection } from '@libp2p/interface-connection';
import { CreateListenerOptions, DialOptions, Listener, symbol, Transport } from '@libp2p/interface-transport';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import { v4 as genUuid } from 'uuid';
import  defer, { DeferredPromise }  from 'p-defer';

const log = logger('libp2p:webrtc:transport');
const utf8 = new TextEncoder();

export class WebRTCTransport implements Transport, Initializable {
  private components: DeferredPromise<Components> = defer();

  init(components: Components): void {
    this.components.resolve(components)
  }

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
    let comps = await this.components.promise;
    // let registrar = (await this.components.promise).getRegistrar();
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
    let dataChannelOpenPromise = defer();
    handshakeDataChannel.onopen = (_) => dataChannelOpenPromise.resolve();
    setTimeout(dataChannelOpenPromise.reject, 10000);
    await dataChannelOpenPromise;

    let myPeerId = comps.getPeerId();
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
    let wrappedChannel = new WebRTCStream({ channel: handshakeDataChannel, stat: { direction: 'outbound', timeline: { open: 0 } } });
    let wrappedDuplex = {
      ...wrappedChannel,
      source: {
        [Symbol.asyncIterator]: async function* () {
          for await (const list of wrappedChannel.source) {
            yield list.subarray();
          }
        },
      },
    };
    await noise.secureOutbound(myPeerId, wrappedDuplex, theirPeerId);

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
