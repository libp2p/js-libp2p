import * as ic from '@libp2p/interface-connection'
import {createEd25519PeerId} from '@libp2p/peer-id-factory';
import {mockRegistrar, mockUpgrader} from '@libp2p/interface-mocks';
import {Components} from '@libp2p/components';
import defer, {DeferredPromise} from 'p-defer';
import {WebRTCConnection} from '../src/connection';
import {Multiaddr} from '@multiformats/multiaddr';
import {v4} from 'uuid';
import {Registrar, StreamHandler} from '@libp2p/interface-registrar';
import { pipe } from 'it-pipe';
import { logger } from '@libp2p/logger';

const log = logger('libp2p:webrtc:test:util');

export const echoHandler: StreamHandler = ({ stream }) => pipe(stream.source, stream.sink);

export async function createConnectedRTCPeerConnectionPair(): Promise<RTCPeerConnection[]> {
  let [client, server] = [new RTCPeerConnection(), new RTCPeerConnection()];
  log('created peer connections');
  // we don't need auth for a local test but we need a component for candidate gathering
  client.createDataChannel('data');
  client.onicecandidate = ({candidate}) => {
    if (candidate !== null) {
      server.addIceCandidate(candidate);
    }
  };
  server.onicecandidate = ({candidate}) => {
    if (candidate !== null) {
      client.addIceCandidate(candidate);
    }
  };
  let resolveOnConnect = (pc: RTCPeerConnection): DeferredPromise<void> => {
    let promise: DeferredPromise<void> = defer();
    pc.onconnectionstatechange = (_evt) => {
      switch (pc.connectionState) {
        case 'connected':
          log.trace('pc connected');
          promise.resolve();
          return;
        case 'failed':
        case 'disconnected':
          promise.reject(`Peerconnection state: ${pc.connectionState}`);
          return;
      }
    };
    return promise;
  }

  let clientConnected = resolveOnConnect(client);
  let serverConnected = resolveOnConnect(server);
  log('set callbacks on peerconnections');

  let clientOffer = await client.createOffer();
  await client.setLocalDescription(clientOffer);
  await server.setRemoteDescription(clientOffer);
  let serverAnswer = await server.createAnswer();
  await server.setLocalDescription(serverAnswer);
  await client.setRemoteDescription(serverAnswer);
  log('completed sdp exchange');

  await Promise.all([clientConnected.promise, serverConnected.promise])

  log.trace(`clientstate: ${client.connectionState}, serverstate: ${server.connectionState}`)

  // let dc = client.createDataChannel('test');
  // log.trace('awaiting test datachannel opening');
  // await new Promise<void>((res) => {
  //   dc.onopen = () => res();
  // });

  log('created peer connections');
  return [client, server];
}

export async function createConnectionPair(): Promise<{ connection: ic.Connection, registrar: Registrar }[]> {
  let [clientPeerId, serverPeerId] = await Promise.all([createEd25519PeerId(), createEd25519PeerId()]);
  let [clientRegistrar, serverRegistrar] = [mockRegistrar(), mockRegistrar()];
  let upgrader = mockUpgrader();
  let [client, server] = await createConnectedRTCPeerConnectionPair();
  let clientConnection = new WebRTCConnection({
    id: v4(),
    pc: client,
    localPeer: clientPeerId,
    remotePeer: serverPeerId,
    remoteAddr: new Multiaddr(),
    components: new Components({
      peerId: clientPeerId,
      registrar: clientRegistrar,
      upgrader: upgrader,
    }),
    direction: 'outbound',
  });
  let serverConnection = new WebRTCConnection({
    id: v4(),
    pc: server,
    localPeer: serverPeerId,
    remotePeer: clientPeerId,
    remoteAddr: new Multiaddr(),
    components: new Components({
      peerId: serverPeerId,
      registrar: serverRegistrar,
      upgrader: upgrader,
    }),
    direction: 'inbound',
  });
  return [
    { connection: clientConnection, registrar: clientRegistrar },
    { connection: serverConnection, registrar: serverRegistrar },
  ];
}
