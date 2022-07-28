import { WebRTCDialOptions }  from './options';
//import { fromMultiAddr }      from './sdp'
import { Connection }         from '@libp2p/interface-connection';
import {CreateListenerOptions}from '@libp2p/interface-transport'
import {Listener, Transport } from '@libp2p/interface-transport'
import {DialOptions, symbol } from '@libp2p/interface-transport'
import { logger }             from '@libp2p/logger'
import { Multiaddr }          from '@multiformats/multiaddr';
import { v4 as genUuid }      from 'uuid';

const log = logger('libp2p:webrtc:transport')

export class WebRTCTransport implements Transport {

	async dial(ma: Multiaddr, options: DialOptions): Promise<Connection> {
		const rawConn = this._connect(ma, options);
		log('new outbound connection %s', rawConn, genUuid());
		throw new Error("not implemented");
	}

	createListener(options: CreateListenerOptions): Listener {
		throw new Error("TODO - replace with an exception more appropriate to the fact that this will not be implemented.");
	}

	filter(multiaddrs: Multiaddr[]): Multiaddr[] {
		return []
	};

	get [Symbol.toStringTag](): string {
		return '@libp2p/webrtc'
	}

	get [symbol](): true {
		return true
	}

	todo_cb() {
	}

	_connect (ma: Multiaddr, options: WebRTCDialOptions) {
		//let peerConnection = new RTCPeerConnection();
		//let handshakeChannel = peerConnection.createDataChannel("data", {negotiated: true, id: 1} );
		throw new Error("not implemented")
    }

}
