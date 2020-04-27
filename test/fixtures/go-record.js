'use strict'
const { Buffer } = require('buffer')
// Fixtures generated using gore (https://github.com/motemen/gore)
//
// :import github.com/libp2p/go-libp2p-record
// :import github.com/libp2p/go-libp2p-crypto
//
// priv, pub, err := crypto.GenerateKeyPair(crypto.RSA, 1024)
//
// rec, err := record.MakePutRecord(priv, "hello", []byte("world"), false)
// rec2, err := recordd.MakePutRecord(priv, "hello", []byte("world"), true)
//
// :import github.com/gogo/protobuf/proto
// enc, err := proto.Marshal(rec)
// enc2, err := proto.Marshal(rec2)
//
// :import io/ioutil
// ioutil.WriteFile("js-libp2p-record/test/fixtures/record.bin", enc, 0644)
// ioutil.WriteFile("js-libp2p-record/test/fixtures/record-signed.bin", enc2, 0644)
module.exports = {
  serialized: Buffer.from(
    '0a0568656c6c6f1205776f726c641a2212201bd5175b1d4123ee29665348c60ea5cf5ac62e2e05215b97a7b9a9b0cf71d116',
    'hex'
  ),
  serializedSigned: Buffer.from(
    '0a0568656c6c6f1205776f726c641a2212201bd5175b1d4123ee29665348c60ea5cf5ac62e2e05215b97a7b9a9b0cf71d116228001500fe7505698b8a873ccde6f1d36a2be662d57807490d9a9959540f2645a454bf615215092e10123f6ffc4ed694711bfbb1d5ccb62f3da83cf4528ee577a96b6cf0272eef9a920bd56459993690060353b72c22b8c03ad2a33894522dac338905b201179a85cb5e2fc68ed58be96cf89beec6dc0913887dddc10f202a2a1b117',
    'hex'
  )
}
