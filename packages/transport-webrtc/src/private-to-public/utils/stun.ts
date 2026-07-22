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
