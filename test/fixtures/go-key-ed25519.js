'use strict'
const { Buffer } = require('buffer')

module.exports = {
  // These were generated in a gore (https://github.com/motemen/gore) repl session:
  //
  // :import github.com/libp2p/go-libp2p-crypto
  // :import crypto/rand
  // priv, pub, err := crypto.GenerateEd25519Key(rand.Reader)
  // pubkeyBytes, err := pub.Bytes()
  // privkeyBytes, err := priv.Bytes()
  // data := []byte("hello! and welcome to some awesome crypto primitives")
  // sig, err := priv.Sign(data)
  //
  // :import io/ioutil
  // ioutil.WriteFile("/tmp/pubkey_go.bin", pubkeyBytes, 0644)
  // // etc..
  //
  // Then loaded into a node repl and dumped to arrays with:
  //
  // var pubkey = Array.from(fs.readFileSync('/tmp/pubkey_go.bin'))
  // console.log(JSON.stringify(pubkey))
  verify: {
    privateKey: Buffer.from([8, 1, 18, 96, 201, 208, 1, 110, 176, 16, 230, 37, 66, 184, 149, 252, 78, 56, 206, 136, 2, 38, 118, 152, 226, 197, 117, 200, 54, 189, 156, 218, 184, 7, 118, 57, 233, 49, 221, 97, 164, 158, 241, 129, 73, 166, 225, 255, 193, 118, 22, 84, 55, 15, 249, 168, 225, 180, 198, 191, 14, 75, 187, 243, 150, 91, 232, 37, 233, 49, 221, 97, 164, 158, 241, 129, 73, 166, 225, 255, 193, 118, 22, 84, 55, 15, 249, 168, 225, 180, 198, 191, 14, 75, 187, 243, 150, 91, 232, 37]),
    publicKey: Buffer.from([8, 1, 18, 32, 233, 49, 221, 97, 164, 158, 241, 129, 73, 166, 225, 255, 193, 118, 22, 84, 55, 15, 249, 168, 225, 180, 198, 191, 14, 75, 187, 243, 150, 91, 232, 37]),
    data: Buffer.from([104, 101, 108, 108, 111, 33, 32, 97, 110, 100, 32, 119, 101, 108, 99, 111, 109, 101, 32, 116, 111, 32, 115, 111, 109, 101, 32, 97, 119, 101, 115, 111, 109, 101, 32, 99, 114, 121, 112, 116, 111, 32, 112, 114, 105, 109, 105, 116, 105, 118, 101, 115]),
    signature: Buffer.from([7, 230, 175, 164, 228, 58, 78, 208, 62, 243, 73, 142, 83, 195, 176, 217, 166, 62, 41, 165, 168, 164, 75, 179, 163, 86, 102, 32, 18, 84, 150, 237, 39, 207, 213, 20, 134, 237, 50, 41, 176, 183, 229, 133, 38, 255, 42, 228, 68, 186, 100, 14, 175, 156, 243, 118, 125, 125, 120, 212, 124, 103, 252, 12])
  }
}
