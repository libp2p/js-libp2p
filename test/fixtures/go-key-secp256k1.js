'use strict'

const uint8ArrayFromString = require('uint8arrays/from-string')

// The keypair and signature below were generated in a gore repl session (https://github.com/motemen/gore)
// using the secp256k1 fork of go-libp2p-crypto by github user @vyzo
//
// gore> :import github.com/vyzo/go-libp2p-crypto
// gore> :import crypto/rand
// gore> :import io/ioutil
// gore> priv, pub, err := crypto.GenerateKeyPairWithReader(crypto.Secp256k1, 256, rand.Reader)
// gore> privBytes, err := priv.Bytes()
// gore> pubBytes, err := pub.Bytes()
// gore> msg := []byte("hello! and welcome to some awesome crypto primitives")
// gore> sig, err := priv.Sign(msg)
// gore> ioutil.WriteFile("/tmp/secp-go-priv.bin", privBytes, 0644)
// gore> ioutil.WriteFile("/tmp/secp-go-pub.bin", pubBytes, 0644)
// gore> ioutil.WriteFile("/tmp/secp-go-sig.bin", sig, 0644)
//
// The generated files were then read in a node repl with e.g.:
// > fs.readFileSync('/tmp/secp-go-pub.bin').toString('hex')
// '08021221029c0ce5d53646ed47112560297a3e59b78b8cbd4bae37c7a0c236eeb91d0fbeaf'
//
// and the results copy/pasted in here

module.exports = {
  privateKey: uint8ArrayFromString('08021220358f15db8c2014d570e8e3a622454e2273975a3cca443ec0c45375b13d381d18', 'base16'),
  publicKey: uint8ArrayFromString('08021221029c0ce5d53646ed47112560297a3e59b78b8cbd4bae37c7a0c236eeb91d0fbeaf', 'base16'),
  message: uint8ArrayFromString('hello! and welcome to some awesome crypto primitives'),
  signature: uint8ArrayFromString('304402200e4c629e9f5d99439115e60989cd40087f6978c36078b0b50cf3d30af5c38d4102204110342c8e7f0809897c1c7a66e49e1c6b7cb0a6ed6993640ec2fe742c1899a9', 'base16')
}
