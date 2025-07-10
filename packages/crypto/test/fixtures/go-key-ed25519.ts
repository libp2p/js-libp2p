export default {
  // Generation code from https://github.com/libp2p/js-libp2p-crypto/issues/175#issuecomment-634467463
  //
  // package main
  //
  // import (
  //   "crypto/rand"
  //   "fmt"
  //   "strings"

  //   "github.com/libp2p/go-libp2p-core/crypto"
  // )

  // func main() {
  //   privateKey, publicKey, _ := crypto.GenerateEd25519Key(rand.Reader)
  //   publicKeyBytes, _ := publicKey.Bytes()
  //   privateKeyBytes, _ := privateKey.Bytes()
  //   data := []byte("hello! and welcome to some awesome crypto primitives")
  //   sig, _ := privateKey.Sign(data)
  //   fmt.Println("{\n  publicKey: Uint8Array.from(", strings.Replace(fmt.Sprint(publicKeyBytes), " ", ",", -1), "),")
  //   fmt.Println("  privateKey: Uint8Array.from(", strings.Replace(fmt.Sprint(privateKeyBytes), " ", ",", -1), "),")
  //   fmt.Println("  data: Uint8Array.from(", strings.Replace(fmt.Sprint(data), " ", ",", -1), "),")
  //   fmt.Println("  signature: Uint8Array.from(", strings.Replace(fmt.Sprint(sig), " ", ",", -1), ")\n}")
  // }
  //

  // The legacy key unnecessarily appends the publickey. (It's already included) See https://github.com/libp2p/js-libp2p-crypto/issues/175
  redundantPubKey: {
    privateKey: Uint8Array.from([8, 1, 18, 96, 201, 208, 1, 110, 176, 16, 230, 37, 66, 184, 149, 252, 78, 56, 206, 136, 2, 38, 118, 152, 226, 197, 117, 200, 54, 189, 156, 218, 184, 7, 118, 57, 233, 49, 221, 97, 164, 158, 241, 129, 73, 166, 225, 255, 193, 118, 22, 84, 55, 15, 249, 168, 225, 180, 198, 191, 14, 75, 187, 243, 150, 91, 232, 37, 233, 49, 221, 97, 164, 158, 241, 129, 73, 166, 225, 255, 193, 118, 22, 84, 55, 15, 249, 168, 225, 180, 198, 191, 14, 75, 187, 243, 150, 91, 232, 37]),
    publicKey: Uint8Array.from([8, 1, 18, 32, 233, 49, 221, 97, 164, 158, 241, 129, 73, 166, 225, 255, 193, 118, 22, 84, 55, 15, 249, 168, 225, 180, 198, 191, 14, 75, 187, 243, 150, 91, 232, 37]),
    data: Uint8Array.from([104, 101, 108, 108, 111, 33, 32, 97, 110, 100, 32, 119, 101, 108, 99, 111, 109, 101, 32, 116, 111, 32, 115, 111, 109, 101, 32, 97, 119, 101, 115, 111, 109, 101, 32, 99, 114, 121, 112, 116, 111, 32, 112, 114, 105, 109, 105, 116, 105, 118, 101, 115]),
    signature: Uint8Array.from([7, 230, 175, 164, 228, 58, 78, 208, 62, 243, 73, 142, 83, 195, 176, 217, 166, 62, 41, 165, 168, 164, 75, 179, 163, 86, 102, 32, 18, 84, 150, 237, 39, 207, 213, 20, 134, 237, 50, 41, 176, 183, 229, 133, 38, 255, 42, 228, 68, 186, 100, 14, 175, 156, 243, 118, 125, 125, 120, 212, 124, 103, 252, 12])
  },
  verify: {
    publicKey: Uint8Array.from([8, 1, 18, 32, 163, 176, 195, 47, 254, 208, 49, 5, 192, 102, 32, 63, 58, 202, 171, 153, 146, 164, 25, 212, 25, 91, 146, 26, 117, 165, 148, 6, 207, 90, 217, 126]),
    privateKey: Uint8Array.from([8, 1, 18, 64, 232, 56, 175, 20, 240, 160, 19, 47, 92, 88, 115, 221, 164, 13, 36, 162, 158, 136, 247, 31, 29, 231, 76, 143, 12, 91, 193, 4, 88, 33, 67, 23, 163, 176, 195, 47, 254, 208, 49, 5, 192, 102, 32, 63, 58, 202, 171, 153, 146, 164, 25, 212, 25, 91, 146, 26, 117, 165, 148, 6, 207, 90, 217, 126]),
    data: Uint8Array.from([104, 101, 108, 108, 111, 33, 32, 97, 110, 100, 32, 119, 101, 108, 99, 111, 109, 101, 32, 116, 111, 32, 115, 111, 109, 101, 32, 97, 119, 101, 115, 111, 109, 101, 32, 99, 114, 121, 112, 116, 111, 32, 112, 114, 105, 109, 105, 116, 105, 118, 101, 115]),
    signature: Uint8Array.from([160, 125, 30, 62, 213, 189, 239, 92, 87, 76, 205, 169, 251, 149, 187, 57, 96, 85, 175, 213, 22, 132, 229, 60, 196, 18, 117, 194, 12, 174, 135, 31, 39, 168, 174, 103, 78, 55, 37, 222, 37, 172, 222, 239, 153, 63, 197, 152, 67, 167, 191, 215, 161, 212, 216, 163, 81, 77, 45, 228, 151, 79, 101, 1])
  }
}
