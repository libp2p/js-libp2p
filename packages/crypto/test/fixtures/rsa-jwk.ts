import { base64url } from 'multiformats/bases/base64'
import { encodeInteger, encodeSequence } from '../../src/der.ts'
import { PrivateKeyMessage } from '../../src/pb.ts'

/**
 * Convert a private RSA JWK into a protobuf PrivateKey message containing a
 * PKCS#1 DER encoded key
 */
export function pkcs1FromJwk (jwk: JsonWebKey): Uint8Array {
  const fields = [jwk.n, jwk.e, jwk.d, jwk.p, jwk.q, jwk.dp, jwk.dq, jwk.qi]
    .map(field => encodeInteger(base64url.baseDecode(field ?? '')))

  return PrivateKeyMessage.encode({
    Type: 0,
    Data: encodeSequence([encodeInteger(Uint8Array.from([0])), ...fields]).subarray()
  })
}
