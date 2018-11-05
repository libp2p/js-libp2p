<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p-crypto/compare/v0.14.0...v0.14.1) (2018-11-05)


### Bug Fixes

* dont setimmediate when its not needed ([9e57786](https://github.com/libp2p/js-libp2p-crypto/commit/9e57786))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.13.0...v0.14.0) (2018-09-17)


### Bug Fixes

* windows build ([c7e0409](https://github.com/libp2p/js-libp2p-crypto/commit/c7e0409))
* **lint:** use ~ for ursa-optional version ([e8cbf13](https://github.com/libp2p/js-libp2p-crypto/commit/e8cbf13))


### Features

* use ursa-optional for lightning fast key generation ([b05e77f](https://github.com/libp2p/js-libp2p-crypto/commit/b05e77f))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.12.1...v0.13.0) (2018-04-05)



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-crypto/compare/v0.12.0...v0.12.1) (2018-02-12)



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.11.0...v0.12.0) (2018-01-27)


### Features

* improve perf ([#117](https://github.com/libp2p/js-libp2p-crypto/issues/117)) ([cdcca5f](https://github.com/libp2p/js-libp2p-crypto/commit/cdcca5f))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.10.4...v0.11.0) (2017-12-20)


### Features

* key exchange with jsrsasign ([#115](https://github.com/libp2p/js-libp2p-crypto/issues/115)) ([b342128](https://github.com/libp2p/js-libp2p-crypto/commit/b342128))



<a name="0.10.4"></a>
## [0.10.4](https://github.com/libp2p/js-libp2p-crypto/compare/v0.10.3...v0.10.4) (2017-12-01)


### Bug Fixes

* catch error when unmarshaling instead of crashing ([#113](https://github.com/libp2p/js-libp2p-crypto/issues/113)) ([7608fdd](https://github.com/libp2p/js-libp2p-crypto/commit/7608fdd))



<a name="0.10.3"></a>
## [0.10.3](https://github.com/libp2p/js-libp2p-crypto/compare/v0.10.2...v0.10.3) (2017-09-07)


### Features

* switch protocol-buffers to protons ([#110](https://github.com/libp2p/js-libp2p-crypto/issues/110)) ([3a91ae2](https://github.com/libp2p/js-libp2p-crypto/commit/3a91ae2))



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p-crypto/compare/v0.10.1...v0.10.2) (2017-09-06)


### Bug Fixes

* use regular protocol-buffers until protobufjs is fixed ([#109](https://github.com/libp2p/js-libp2p-crypto/issues/109)) ([957fdd3](https://github.com/libp2p/js-libp2p-crypto/commit/957fdd3))


### Features

* **deps:** upgrade to aegir@12 and browserify-aes@1.0.8 ([83257bc](https://github.com/libp2p/js-libp2p-crypto/commit/83257bc))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-crypto/compare/v0.10.0...v0.10.1) (2017-09-05)


### Bug Fixes

* switch to protobufjs ([#107](https://github.com/libp2p/js-libp2p-crypto/issues/107)) ([dc2793f](https://github.com/libp2p/js-libp2p-crypto/commit/dc2793f))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.9.4...v0.10.0) (2017-09-03)


### Features

* p2p addrs situation ([#106](https://github.com/libp2p/js-libp2p-crypto/issues/106)) ([9e977c7](https://github.com/libp2p/js-libp2p-crypto/commit/9e977c7))
* skip nextTick in nodeify ([#103](https://github.com/libp2p/js-libp2p-crypto/issues/103)) ([f20267b](https://github.com/libp2p/js-libp2p-crypto/commit/f20267b))



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-crypto/compare/v0.9.3...v0.9.4) (2017-07-22)


### Bug Fixes

* circular circular dep -> DI ([bc554d1](https://github.com/libp2p/js-libp2p-crypto/commit/bc554d1))



<a name="0.9.3"></a>
## [0.9.3](https://github.com/libp2p/js-libp2p-crypto/compare/v0.9.2...v0.9.3) (2017-07-22)



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-crypto/compare/v0.9.1...v0.9.2) (2017-07-22)



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-crypto/compare/v0.9.0...v0.9.1) (2017-07-22)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.8.8...v0.9.0) (2017-07-22)



<a name="0.8.8"></a>
## [0.8.8](https://github.com/libp2p/js-libp2p-crypto/compare/v0.8.7...v0.8.8) (2017-04-11)


### Bug Fixes

* **ecdh:** allow base64 to be left-0-padded, needed for JWK format  ([be64372](https://github.com/libp2p/js-libp2p-crypto/commit/be64372)), closes [#97](https://github.com/libp2p/js-libp2p-crypto/issues/97)



<a name="0.8.7"></a>
## [0.8.7](https://github.com/libp2p/js-libp2p-crypto/compare/v0.8.6...v0.8.7) (2017-03-21)



<a name="0.8.6"></a>
## [0.8.6](https://github.com/libp2p/js-libp2p-crypto/compare/v0.8.5...v0.8.6) (2017-03-03)


### Bug Fixes

* **package:** update tweetnacl to version 1.0.0-rc.1 ([4e56e17](https://github.com/libp2p/js-libp2p-crypto/commit/4e56e17))


### Features

* **keys:** implement generateKeyPairFromSeed for ed25519  ([e5b7c1f](https://github.com/libp2p/js-libp2p-crypto/commit/e5b7c1f))



