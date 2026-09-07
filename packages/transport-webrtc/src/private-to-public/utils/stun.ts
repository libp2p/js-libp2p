import { UFRAG_PREFIX_V1, UFRAG_PREFIX_V2 } from '../../constants.ts'
import type { Logger } from '@libp2p/interface'
import type { IceUdpMuxRequest } from 'node-datachannel'

// ICE credential charset and length, per RFC 8839 section 5.4
// (ice-char = ALPHA / DIGIT / "+" / "/"; ufrag = 4*256ice-char;
// password = 22*256ice-char).
//
// ice-char is ASCII-only, so any string that passes ICE_CHAR_REGEX has exactly
// one UTF-16 code unit per character. The String.length checks below therefore
// equal both the ice-char count and the byte length that go-libp2p measures with
// len(), so the two implementations accept the same credentials; non-ice-char
// input (including any multi-byte character) is rejected by both regardless of
// how each counts length.
const ICE_CHAR_REGEX = /^[A-Za-z0-9+/]+$/
const ICE_UFRAG_MIN_LENGTH = 4
const ICE_PWD_MIN_LENGTH = 22
const ICE_CREDENTIAL_MAX_LENGTH = 256

/**
 * True if `value` is a valid ICE username fragment
 * (RFC 8839 section 5.4: ufrag = 4*256ice-char).
 */
export function isIceUfrag (value: string): boolean {
  return value.length >= ICE_UFRAG_MIN_LENGTH && value.length <= ICE_CREDENTIAL_MAX_LENGTH && ICE_CHAR_REGEX.test(value)
}

/**
 * True if `value` is a valid ICE password
 * (RFC 8839 section 5.4: password = 22*256ice-char).
 */
export function isIcePwd (value: string): boolean {
  return value.length >= ICE_PWD_MIN_LENGTH && value.length <= ICE_CREDENTIAL_MAX_LENGTH && ICE_CHAR_REGEX.test(value)
}

export function parseStunUsernameUfrags (serverUfrag: string, clientUfrag: string): { serverUfrag: string, clientUfrag: string } | undefined {
  // Both fragments come from the attacker-controlled STUN USERNAME
  // ("<remote-ufrag>:<local-ufrag>", RFC 8445 section 7.2.2) and are ICE username
  // fragments. Reject anything outside ice-char or the length bounds in RFC 8839
  // section 5.4 before it goes into an SDP offer.
  if (!isIceUfrag(serverUfrag) || !isIceUfrag(clientUfrag)) {
    return undefined
  }

  return {
    serverUfrag,
    clientUfrag
  }
}

/**
 * The v2 server ufrag carries the client's ICE password so the server can
 * infer the client's offer from the STUN USERNAME alone.
 */
export function serverUfragV2 (clientIcePwd: string): string {
  return `${UFRAG_PREFIX_V2}${clientIcePwd}`
}

export function decodeV2ClientPwd (serverUfrag: string): string | undefined {
  if (!serverUfrag.startsWith(UFRAG_PREFIX_V2)) {
    return undefined
  }

  const clientPwd = serverUfrag.substring(UFRAG_PREFIX_V2.length)

  // The recovered value becomes the inferred offer's ice-pwd, so it must be a
  // valid ICE password (ice-char, length 22..256) per RFC 8839 section 5.4.
  if (!isIcePwd(clientPwd)) {
    return undefined
  }

  return clientPwd
}

export interface StunRequestCallback {
  (serverUfrag: string, clientUfrag: string, clientPwd: string | undefined, remoteHost: string, remotePort: number): void
}

/**
 * Validate a STUN request received by the UDP mux listener and forward the ICE
 * credentials it carries. Every value comes from the attacker-controlled STUN
 * USERNAME and is reused as an ICE credential during native connection setup,
 * where an invalid value aborts the process, so anything malformed is dropped
 * here.
 */
export function handleStunRequest (request: IceUdpMuxRequest, log: Logger, cb: StunRequestCallback): void {
  if (request.ufrag == null) {
    return
  }

  // The STUN USERNAME is "server_ufrag:client_ufrag" (RFC 8445 section 7.2.2).
  // When the mux cannot split it (no colon) localUfrag is absent and the single
  // ufrag is the shared v1 value used as both the server and client ufrag.
  const serverUfrag = request.localUfrag ?? request.ufrag
  const clientUfrag = request.ufrag

  const parsed = parseStunUsernameUfrags(serverUfrag, clientUfrag)
  if (parsed == null) {
    log.trace('incoming STUN packet from %s:%d had invalid ufrags %s %s', request.host, request.port, serverUfrag, clientUfrag)
    return
  }

  // Select the version explicitly from the server ufrag prefix. An unrecognized
  // version is rejected, never assumed to be v1. See https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md.
  if (parsed.serverUfrag.startsWith(UFRAG_PREFIX_V2)) {
    const clientPwd = decodeV2ClientPwd(parsed.serverUfrag)
    if (clientPwd == null) {
      log.trace('incoming v2 STUN packet from %s:%d had an invalid client password %s', request.host, request.port, parsed.serverUfrag)
      return
    }
    log.trace('incoming v2 STUN packet from %s:%d %s:%s', request.host, request.port, parsed.serverUfrag, parsed.clientUfrag)
    cb(parsed.serverUfrag, parsed.clientUfrag, clientPwd, request.host, request.port)
    return
  }

  if (parsed.serverUfrag.startsWith(UFRAG_PREFIX_V1)) {
    // v1 reuses both ufrags as ICE passwords, so they must also satisfy the
    // password length bound or native setup aborts the process
    if (!isIcePwd(parsed.serverUfrag) || !isIcePwd(parsed.clientUfrag)) {
      log.trace('incoming v1 STUN packet from %s:%d had ufrags that are not valid ICE passwords %s %s', request.host, request.port, parsed.serverUfrag, parsed.clientUfrag)
      return
    }
    log.trace('incoming v1 STUN packet from %s:%d %s', request.host, request.port, parsed.serverUfrag)
    cb(parsed.serverUfrag, parsed.clientUfrag, undefined, request.host, request.port)
    return
  }

  log.trace('incoming STUN packet from %s:%d has an unsupported version prefix %s', request.host, request.port, parsed.serverUfrag)
}
