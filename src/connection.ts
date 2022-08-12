import * as ic from '@libp2p/interface-connection';
import { PeerId } from '@libp2p/interface-peer-id';
import { AbortOptions } from '@libp2p/interfaces';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import { v4 as genUuid } from 'uuid';
import { Components } from '@libp2p/components';
import defer from 'p-defer';
import { TimeoutController } from 'timeout-abort-controller';
import { WebRTCStream } from './stream';
import { select as msselect, handle as mshandle } from '@libp2p/multistream-select';
import { Duplex } from 'it-stream-types';
import { Uint8ArrayList } from 'uint8arraylist';
import { DataChannelError, OperationAbortedError, StreamingLimitationError } from './error';

const log = logger('libp2p:webrtc:connection');

type ConnectionInit = {
  components: Components;
  id: string;
  localPeer: PeerId;
  localAddr?: Multiaddr;
  remoteAddr: Multiaddr;
  remotePeer: PeerId;
  direction: ic.Direction;
  tags?: string[];
  pc: RTCPeerConnection;
};

const DEFAULT_MAX_INBOUND_STREAMS = 32;
const DEFAULT_MAX_OUTBOUND_STREAMS = 64;
const OPEN_STREAM_TIMEOUT = 30_000;

export class WebRTCConnection implements ic.Connection {
  id: string;
  stat: ic.ConnectionStat;
  localPeer: PeerId;
  localAddr?: Multiaddr;
  remoteAddr: Multiaddr;
  remotePeer: PeerId;
  tags: string[] = [];
  components: Components;

  private _streams: Map<string, ic.Stream> = new Map();
  private peerConnection: RTCPeerConnection;

  constructor(init: ConnectionInit) {
    this.remoteAddr = init.remoteAddr;
    this.id = init.id;
    this.peerConnection = init.pc;
    this.remotePeer = init.remotePeer;
    this.localPeer = init.localPeer;
    this.localAddr = init.localAddr;
    this.components = init.components;
    this.stat = {
      direction: init.direction,
      status: 'OPEN',
      timeline: {
        open: new Date().getTime(),
      },
    };
    this.handleIncomingStreams();
  }

  private handleIncomingStreams() {
    let metrics = this.components.getMetrics();
    this.peerConnection.ondatachannel = async ({ channel }) => {
      const logPrefix = `[stream:${channel.label}][inbound]`;
      log.trace(`incoming stream - ${channel.label}`);
      let [openPromise, abortPromise] = [defer(), defer()];
      let controller = new TimeoutController(OPEN_STREAM_TIMEOUT);
      controller.signal.onabort = () => abortPromise.resolve();
      channel.onopen = () => openPromise.resolve();

      await Promise.race([openPromise.promise, abortPromise.promise]);
      if (controller.signal.aborted) {
        throw new OperationAbortedError('prior to a new stream incoming.', controller.signal.reason);
      }

      let rawStream = new WebRTCStream({
        channel,
        stat: {
          direction: 'inbound',
          timeline: {
            open: new Date().getTime(),
          },
        },
      });
      let registrar = this.components.getRegistrar();
      let protocols = registrar.getProtocols();

      log.trace(`${logPrefix} supported protocols - ${protocols}`);

      let { stream, protocol } = await mshandle(rawStream, protocols, { signal: controller.signal });
      if (metrics) {
        metrics.trackStream({ stream, protocol, remotePeer: this.remotePeer });
      }

      log.trace(`${logPrefix} handled protocol - ${protocol}`);

      rawStream.stat.protocol = protocol;
      let result = this.wrapMsStream(rawStream, stream);

      this.addStream(result);

      // handle stream
      let { handler } = registrar.getHandler(protocol);
      handler({ connection: this, stream: result });
    };
  }

  private wrapMsStream(rawStream: WebRTCStream, stream: Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array, Promise<void>>): ic.Stream {
    return {
      ...stream,
      close: () => {
        rawStream.close();
      },
      closeRead: () => {
        rawStream.closeRead();
      },
      closeWrite: () => {
        rawStream.closeWrite();
      },
      abort: (err) => {
        rawStream.abort(err);
      },
      reset: () => rawStream.reset(),
      id: rawStream.id,
      metadata: rawStream.metadata,
      stat: rawStream.stat,
    };
  }

  private findStreamLimit(protocol: string, direction: ic.Direction): number {
    let registrar = this.components.getRegistrar();
    try {
      let handler = registrar.getHandler(protocol);
      return direction === 'inbound' ? handler.options.maxInboundStreams || DEFAULT_MAX_INBOUND_STREAMS : handler.options.maxOutboundStreams || DEFAULT_MAX_OUTBOUND_STREAMS;
    } catch (err) {}
    return direction === 'inbound' ? DEFAULT_MAX_INBOUND_STREAMS : DEFAULT_MAX_OUTBOUND_STREAMS;
  }

  private countStream(protocol: string, direction: ic.Direction): number {
    return this.streams.filter((s) => s.stat.protocol === protocol && s.stat.direction === direction).length;
  }

  async newStream(protocols: string | string[], options: AbortOptions = {}): Promise<ic.Stream> {
    let label = genUuid().slice(0, 8);
    let openPromise = defer();
    let abortedPromise = defer();
    let controller: TimeoutController | undefined;
    let metrics = this.components.getMetrics();
    let openError: Error | undefined;

    log.trace(`opening new stream with protocols: ${protocols}`);

    // timeout in case no abort options are provided
    if (options.signal == null) {
      log.trace(`[stream: ${label}] no abort signal provided, creating timeout controller`);
      controller = new TimeoutController(OPEN_STREAM_TIMEOUT);
      options.signal = controller.signal;
    }

    options.signal.onabort = () => {
      openError = new OperationAbortedError('.', options.signal?.reason || 'aborted');
      log.trace(`[stream: ${label}] abort called - ${options.signal?.reason}`);
      abortedPromise.resolve();
    };

    log.trace(`[stream: ${label}] peerconnection state: ${this.peerConnection.connectionState}`);
    let channel = this.peerConnection.createDataChannel(label);
    channel.onopen = (_evt) => {
      log.trace(`[stream: ${label}] data channel opened`);
      openPromise.resolve();
    };
    channel.onerror = (_evt) => {
      openError = new DataChannelError(label, (_evt as RTCErrorEvent).error.message);
      log.trace(openError.message);
      abortedPromise.resolve();
    };

    log.trace(`[stream: ${label}] datachannel state: ${channel.readyState}`);
    await Promise.race([openPromise.promise, abortedPromise.promise]);

    // check for error
    if (openError) {
      // TODO: Better errors
      throw openError;
    }

    let rawStream = new WebRTCStream({
      channel,
      stat: {
        direction: 'outbound',
        timeline: {
          open: new Date().getTime(),
        },
      },
    });

    let { stream, protocol } = await msselect(rawStream, protocols, { signal: options.signal });
    log.trace(`[stream ${label}] select protocol - ${protocol}`);
    // check if stream is within limit after protocol has been negotiated
    rawStream.stat.protocol = protocol;
    let result = this.wrapMsStream(rawStream, stream);
    // check if stream can be accomodated
    if (metrics) {
      metrics.trackStream({ stream, protocol, remotePeer: this.remotePeer });
    }

    this.addStream(result);
    return result;
  }

  addStream(stream: ic.Stream): void {
    let protocol = stream.stat.protocol!;
    let direction = stream.stat.direction;
    if (this.countStream(protocol, direction) === this.findStreamLimit(protocol, direction)) {
      log(`${direction} stream limit reached for protocol - ${protocol}`);
      let err = new StreamingLimitationError(`${direction} stream limit reached for protocol - ${protocol}`);
      stream.abort(err);
      throw err;
    }
    this._streams.set(stream.id, stream);
  }

  removeStream(id: string): void {
    this._streams.delete(id);
  }

  get streams(): ic.Stream[] {
    return Array.from(this._streams.values());
  }

  async close(): Promise<void> {
    this.peerConnection.close();
  }
}
