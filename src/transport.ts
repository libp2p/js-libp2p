import { noise as Noise } from '@chainsafe/libp2p-noise'
import { Connection } from '@libp2p/interface-connection'
import type { PeerId } from '@libp2p/interface-peer-id'
import { CreateListenerOptions, Listener, symbol, Transport } from '@libp2p/interface-transport'
import { logger } from '@libp2p/logger'
import * as p from '@libp2p/peer-id'
import { Multiaddr } from '@multiformats/multiaddr'
import * as multihashes from 'multihashes'
import defer from 'p-defer'
import { v4 as genUuid } from 'uuid'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { concat } from 'uint8arrays/concat'

import { dataChannelError, inappropriateMultiaddr, unimplemented, invalidArgument } from './error.js'
import { WebRTCMultiaddrConnection } from './maconn.js'
import { DataChannelMuxerFactory } from './muxer.js'
import { WebRTCDialOptions } from './options.js'
import * as sdp from './sdp.js'
import { WebRTCStream } from './stream.js'

const log = logger('libp2p:webrtc:transport')

/**
 * The time to wait, in milliseconds, for the data channel handshake to complete
 */
const HANDSHAKE_TIMEOUT_MS = 10000

/**
 * Created by converting the hexadecimal protocol code to an integer.
 *
 * {@link https://github.com/multiformats/multiaddr/blob/master/protocols.csv}
 */
export const WEBRTC_CODE: number = 280

/**
 * Created by converting the hexadecimal protocol code to an integer.
 *
 * {@link https://github.com/multiformats/multiaddr/blob/master/protocols.csv}
 */
export const CERTHASH_CODE: number = 466

/**
 * The peer for this transport
 */
// @TODO(ddimaria): seems like an unnessary abstraction, consider removing
export interface WebRTCTransportComponents {
  peerId: PeerId
}

export class WebRTCTransport implements Transport {
  /**
   * The peer for this transport
   */
  private readonly components: WebRTCTransportComponents

  constructor (components: WebRTCTransportComponents) {
    this.components = components
  }

  /**
   * Dial a given multiaddr
   */
  async dial (ma: Multiaddr, options: WebRTCDialOptions): Promise<Connection> {
    const rawConn = await this._connect(ma, options)
    log(`dialing address - ${ma.toString()}`)
    return rawConn
  }

  /**
   * Create transport listeners no supported by browsers
   */
  createListener (options: CreateListenerOptions): Listener {
    throw unimplemented('WebRTCTransport.createListener')
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid addresses for the transport
   */
  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(validMa)
  }

  /**
   * Implement toString() for WebRTCTransport
   */
  get [Symbol.toStringTag] (): string {
    return '@libp2p/webrtc'
  }

  /**
   * Symbol.for('@libp2p/transport')
   */
  get [symbol] (): true {
    return true
  }

  /**
   * Connect to a peer using a multiaddr
   */
  async _connect (ma: Multiaddr, options: WebRTCDialOptions): Promise<Connection> {
    const rps = ma.getPeerId()

    if (rps === null) {
      throw inappropriateMultiaddr("we need to have the remote's PeerId")
    }

    const remoteCerthash = sdp.decodeCerthash(sdp.certhash(ma))

    // ECDSA is preferred over RSA here. From our testing we find that P-256 elliptic
    // curve is supported by Pion, webrtc-rs, as well as Chromium (P-228 and P-384
    // was not supported in Chromium). We use the same hash function as found in the
    // multiaddr if it is supported.
    const certificate = await RTCPeerConnection.generateCertificate({
      name: 'ECDSA',
      namedCurve: 'P-256',
      hash: sdp.toSupportedHashFunction(remoteCerthash.name)
    } as any)
    const peerConnection = new RTCPeerConnection({ certificates: [certificate] })

    // create data channel for running the noise handshake. Once the data channel is opened,
    // the remote will initiate the noise handshake. This is used to confirm the identity of
    // the peer.
    const dataChannelOpenPromise = defer()
    const handshakeDataChannel = peerConnection.createDataChannel('handshake', { negotiated: true, id: 0 })
    const handhsakeTimeout = setTimeout(() => {
      const error = `Data channel was never opened: state: ${handshakeDataChannel.readyState}`
      log.error(error)
      dataChannelOpenPromise.reject(dataChannelError('data', error))
    }, HANDSHAKE_TIMEOUT_MS)

    handshakeDataChannel.onopen = (_) => {
      clearTimeout(handhsakeTimeout)
      dataChannelOpenPromise.resolve()
    }

    // ref: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/error_event
    handshakeDataChannel.onerror = (event: Event) => {
      clearTimeout(handhsakeTimeout)
      const errorTarget = event.target?.toString() ?? 'not specified'
      const error = `Error opening a data channel for handshaking: ${errorTarget}`
      log.error(error)
      dataChannelOpenPromise.reject(dataChannelError('data', error))
    }

    const ufrag = 'libp2p+webrtc+v1/' + genUuid().replaceAll('-', '')

    // Create offer and munge sdp with ufrag = pwd. This allows the remote to
    // respond to STUN messages without performing an actual SDP exchange.
    // This is because it can infer the passwd field by reading the USERNAME
    // attribute of the STUN message.
    const offerSdp = await peerConnection.createOffer()
    const mungedOfferSdp = sdp.munge(offerSdp, ufrag)
    await peerConnection.setLocalDescription(mungedOfferSdp)

    // construct answer sdp from multiaddr and ufrag
    const answerSdp = sdp.fromMultiAddr(ma, ufrag)
    await peerConnection.setRemoteDescription(answerSdp)

    // wait for peerconnection.onopen to fire, or for the datachannel to open
    await dataChannelOpenPromise.promise

    const myPeerId = this.components.peerId
    const theirPeerId = p.peerIdFromString(rps)

    // Do noise handshake.
    // Set the Noise Prologue to libp2p-webrtc-noise:<FINGERPRINTS> before starting the actual Noise handshake.
    // <FINGERPRINTS> is the concatenation of the of the two TLS fingerprints of A and B in their multihash byte representation, sorted in ascending order.
    const fingerprintsPrologue = this.generateNoisePrologue(peerConnection, remoteCerthash.name, ma)

    // Since we use the default crypto interface and do not use a static key or early data,
    // we pass in undefined for these parameters.
    const noiseInit = { staticNoiseKey: undefined, extensions: undefined, crypto: undefined, prologueBytes: fingerprintsPrologue }
    const noise = Noise(noiseInit)()
    const wrappedChannel = new WebRTCStream({ channel: handshakeDataChannel, stat: { direction: 'outbound', timeline: { open: 1 } } })
    const wrappedDuplex = {
      ...wrappedChannel,
      source: {
        [Symbol.asyncIterator]: async function * () {
          for await (const list of wrappedChannel.source) {
            yield list.subarray()
          }
        }
      }
    }

    // Creating the connection before completion of the noise
    // handshake ensures that the stream opening callback is set up
    const maConn = new WebRTCMultiaddrConnection({
      peerConnection,
      remoteAddr: ma,
      timeline: {
        open: (new Date()).getTime()
      }
    })

    const muxerFactory = new DataChannelMuxerFactory(peerConnection)

    // For outbound connections, the remote is expected to start the noise handshake.
    // Therefore, we need to secure an inbound noise connection from the remote.
    await noise.secureInbound(myPeerId, wrappedDuplex, theirPeerId)

    return await options.upgrader.upgradeOutbound(maConn, { skipProtection: true, skipEncryption: true, muxerFactory })
  }

  /**
   * Generate a noise prologue from the peer connection's certificate.
   * noise prologue = bytes('libp2p-webrtc-noise:') + noise-responder fingerprint + noise-initiator fingerprint
   */
  private generateNoisePrologue (pc: RTCPeerConnection, hashName: multihashes.HashName, ma: Multiaddr): Uint8Array {
    if (pc.getConfiguration().certificates?.length === 0) {
      throw invalidArgument('no local certificate')
    }

    const localCert = pc.getConfiguration().certificates?.at(0)

    if (localCert === undefined || localCert.getFingerprints().length === 0) {
      throw invalidArgument('no fingerprint on local certificate')
    }

    const localFingerprint = localCert.getFingerprints()[0]

    if (localFingerprint.value === undefined) {
      throw invalidArgument('no fingerprint on local certificate')
    }

    const localFpString = localFingerprint.value.replace(/:/g, '')
    const localFpArray = uint8arrayFromString(localFpString, 'hex')
    const local = multihashes.encode(localFpArray, multihashes.names[hashName])
    const remote: Uint8Array = sdp.mbdecoder.decode(sdp.certhash(ma))
    const prefix = uint8arrayFromString('libp2p-webrtc-noise:')

    return concat([prefix, local, remote])
  }
}

/**
 * Determine if a given multiaddr contains a WebRTC Code (280),
 * a Certhash Code (466) and a PeerId
 */
function validMa (ma: Multiaddr): boolean {
  const codes = ma.protoCodes()
  return codes.includes(WEBRTC_CODE) && codes.includes(CERTHASH_CODE) && ma.getPeerId() != null
}
