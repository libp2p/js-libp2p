import * as ic from '@libp2p/interface-connection';
import { PeerId } from '@libp2p/interface-peer-id';
import { AbortOptions } from '@libp2p/interfaces';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import { v4 as genUuid } from 'uuid';

const log = logger('libp2p:webrtc:connection');

type ConnectionInit = {
  id: string;
  localPeer: PeerId;
  localAddr?: Multiaddr;
  remoteAddr: Multiaddr;
  direction: ic.Direction;
  tags?: string[];
  pc: RTCPeerConnection;
  credential_string: string;
  remotePeerId: PeerId;
};

export class WebRTCConnection implements ic.Connection {
  id: string;
  stat: ic.ConnectionStat;
  remoteAddr: Multiaddr;
  remotePeer: PeerId;
  tags: string[] = [];
  streams: ic.Stream[] = [];
  direction: ic.Direction;

  private peerConnection: RTCPeerConnection;
  private ufrag: string;

  constructor(init: ConnectionInit) {
    this.streams = [];
    this.remoteAddr = init.remoteAddr;
    this.id = init.id;
    this.direction = init.direction;
    this.peerConnection = init.pc;
    this.ufrag = init.credential_string;
    this.stat = {
      direction: 'outbound',
      timeline: { open: 0 },
      status: 'CLOSED',
    };
    this.remotePeer = init.remotePeerId;
    // for muxing incoming stream
    // this._peerConnection.ondatachannel = ({ channel }) => {
    // 	let stream = DataChannelStream(channel)
    // 	this.addStream(stream)
    // }
  }

  async newStream(multicodecs: string | string[], options?: AbortOptions): Promise<ic.Stream> {
    // let label = uuid.v4()
    // let dc = this._peerConnection.createDataChannel(label, {})
    // await datachannel opening
    // return DataChannelStream(dc)
    log('TODO', this.ufrag);
    this.peerConnection.createDataChannel(genUuid());
    throw new Error('not implemented');
  }

  addStream(stream: ic.Stream): void {
    throw new Error('not implemented');
  }
  removeStream(id: string): void {
    throw new Error('not implemented');
  }
  async close(): Promise<void> {
    throw new Error('not implemented');
  }
}
