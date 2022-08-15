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
import defer, { DeferredPromise } from 'p-defer';
import { base64 } from 'multiformats/bases/base64';
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string';
import { concat } from 'uint8arrays/concat';
import * as multihashes from 'multihashes';
import { InvalidArgumentError, UnsupportedHashAlgorithmError } from './error';

const log = logger('libp2p:webrtc:transport');

export class WebRTCTransport implements Transport, Initializable {
  private componentsPromise: DeferredPromise<void> = defer();
  private components: Components | undefined;

  init(components: Components): void {
    this.componentsPromise.resolve();
    this.components = components;
  }

  async dial(ma: Multiaddr, options: DialOptions): Promise<Connection> {
    const rawConn = await this._connect(ma, options);
    log(`dialing address - ${ma}`);
    return rawConn;
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

  async _connect(ma: Multiaddr, options: WebRTCDialOptions): Promise<Connection> {
    let peerConnection = new RTCPeerConnection();
    // create data channel
    let handshakeDataChannel = peerConnection.createDataChannel('data', { negotiated: true, id: 1 });
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
    await dataChannelOpenPromise.promise;

    let myPeerId = this.components!.getPeerId();
    let rps = ma.getPeerId();
    if (!rps) {
      throw new Error('could not get remote peerId');
    }
    let theirPeerId = p.peerIdFromString(rps);

    // do noise handshake
    //set the Noise Prologue to libp2p-webrtc-noise:<FINGERPRINTS> before starting the actual Noise handshake.
    //  <FINGERPRINTS> is the concatenation of the of the two TLS fingerprints of A and B in their multihash byte representation, sorted in ascending order.
    let fingerprintsPrologue = this.generateNoisePrologue(peerConnection, ma);
    let noise = new Noise(myPeerId.privateKey, undefined, stablelib, fingerprintsPrologue);
    let wrappedChannel = new WebRTCStream({ channel: handshakeDataChannel, stat: { direction: 'outbound', timeline: { open: 1 } } });
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
      components: this.components!,
      id: ma.toString(),
      remoteAddr: ma,
      localPeer: myPeerId,
      direction: 'outbound',
      pc: peerConnection,
      remotePeer: theirPeerId,
    });
  }

  private generateNoisePrologue(pc: RTCPeerConnection, ma: Multiaddr): Uint8Array {
    let remoteCerthash = sdp.certhash(ma);
    if (!remoteCerthash) {
      throw new InvalidArgumentError('no remote tls fingerprint in multiaddr');
    }
    let remote = base64.decode(remoteCerthash);
    if (pc.getConfiguration().certificates?.length === 0) {
      throw new InvalidArgumentError('no local certificate');
    }
    let localCert = pc.getConfiguration().certificates![0];
    if (localCert.getFingerprints().length === 0) {
      throw new InvalidArgumentError('no fingerprint on local certificate');
    }

    let localFingerprint = localCert.getFingerprints()[0];
    let localFpString = localFingerprint.value!.replaceAll(':', '');
    let localFpArray = uint8arrayFromString(localFpString, 'hex');
    let local: Uint8Array;
    switch (localFingerprint.algorithm!) {
      case 'md5':
        local = multihashes.encode(localFpArray, multihashes.names['md5']);
        break;
      case 'sha-256':
        local = multihashes.encode(localFpArray, multihashes.names['sha2-256']);
        break;
      case 'sha-512':
        local = multihashes.encode(localFpArray, multihashes.names['sha2-512']);
        break;
      default:
        throw new UnsupportedHashAlgorithmError(localFingerprint.algorithm || 'none');
    }

    let prefix = uint8arrayFromString('libp2p-webrtc-noise:');
    let fps = [local, remote].sort();

    let result = concat([prefix, ...fps]);
    return result;
  }
}
