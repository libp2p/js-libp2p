import { encodingLength } from 'uint8-varint'
import { Message } from './private-to-public/pb/message.js'

/**
 * STUN servers help clients discover their own public IPs.
 *
 * Using five or more servers causes warnings to be printed so
 * ensure we limit it to max x4
 *
 * @see https://gist.github.com/mondain/b0ec1cf5f60ae726202e
 */
export const DEFAULT_ICE_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.services.mozilla.com:3478'
]

/**
 * Characters that can be present in a ufrag
 */
export const UFRAG_ALPHABET = Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890')

/**
 * Used to detect the version of the WebRTC Direct connection protocol in use
 */
export const UFRAG_PREFIX = 'libp2p+webrtc+v1/'

/**
 * The multicodec code for webrtc-direct tuples
 */
export const CODEC_WEBRTC_DIRECT = 0x0118

/**
 * The multicodec code for certhash tuples
 */
export const CODEC_CERTHASH = 0x01d2

/**
 * How much can be buffered to the DataChannel at once
 */
export const MAX_BUFFERED_AMOUNT = 2 * 1024 * 1024

/**
 * How long time we wait for the 'bufferedamountlow' event to be emitted
 */
export const BUFFERED_AMOUNT_LOW_TIMEOUT = 30 * 1000

/**
 * Max message size that can be sent to the DataChannel. In browsers this is
 * 256KiB but go-libp2p and rust-libp2p only support 16KiB at the time of
 * writing.
 *
 * @see https://blog.mozilla.org/webrtc/large-data-channel-messages/
 * @see https://issues.webrtc.org/issues/40644524
 */
export const MAX_MESSAGE_SIZE = 16 * 1024

/**
 * max protobuf overhead:
 *
 * ```
 * [message-length][flag-field-id+type][flag-field-length][flag-field][message-field-id+type][message-field-length][message-field]
 * ```
 */
function calculateProtobufOverhead (maxMessageSize = MAX_MESSAGE_SIZE): number {
  // these have a fixed size
  const messageLength = encodingLength(maxMessageSize - encodingLength(maxMessageSize))
  const flagField = 1 + encodingLength(Object.keys(Message.Flag).length - 1) // id+type/value
  const messageFieldIdType = 1 // id+type
  const available = maxMessageSize - messageLength - flagField - messageFieldIdType

  // let message-length/message-data fill the rest of the message
  const messageFieldLengthLength = encodingLength(available)

  return messageLength + flagField + messageFieldIdType + messageFieldLengthLength
}

/**
 * The protobuf message overhead includes the maximum amount of all bytes in the
 * protobuf that aren't message field bytes
 */
export const PROTOBUF_OVERHEAD = calculateProtobufOverhead()

/**
 * When closing streams we send a FIN then wait for the remote to
 * reply with a FIN_ACK. If that does not happen within this timeout
 * we close the stream anyway.
 */
export const FIN_ACK_TIMEOUT = 5_000

/**
 * When sending data messages, if the channel is not in the "open" state, wait
 * this long for the "open" event to fire.
 */
export const OPEN_TIMEOUT = 5_000

/**
 * When closing a stream, we wait for `bufferedAmount` to become 0 before
 * closing the underlying RTCDataChannel - this controls how long we wait in ms
 */
export const DATA_CHANNEL_DRAIN_TIMEOUT = 30_000

/**
 * Set as the 'negotiated' muxer protocol name
 */
export const MUXER_PROTOCOL = '/webrtc'

/**
 * The protocol used for the signalling stream protocol
 */
export const SIGNALING_PROTOCOL = '/webrtc-signaling/0.0.1'

/**
 * Used to store generated certificates in the datastore
 */
export const DEFAULT_CERTIFICATE_DATASTORE_KEY = '/libp2p/webrtc-direct/certificate'

/**
 * Used to store the certificate private key in the keychain
 */
export const DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME = 'webrtc-direct-certificate-private-key'

/**
 * The default type of certificate private key
 */
export const DEFAULT_CERTIFICATE_PRIVATE_KEY_TYPE = 'ECDSA'

/**
 * How long the certificate is valid for
 */
export const DEFAULT_CERTIFICATE_LIFESPAN = 1_209_600_000

/**
 * Renew the certificate this long before it expires
 */
export const DEFAULT_CERTIFICATE_RENEWAL_THRESHOLD = 86_400_000
