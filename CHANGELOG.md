## [0.19.3](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.7...v0.19.3) (2021-04-11)


### Bug Fixes

* ed25519 key ID generation ([bc33769](https://github.com/libp2p/js-libp2p-crypto/commit/bc337698b6124e3461c8dc4be2f264ea98351c70))
* ed25519 PeerID generation ([#186](https://github.com/libp2p/js-libp2p-crypto/issues/186)) ([1c16dd3](https://github.com/libp2p/js-libp2p-crypto/commit/1c16dd3dec8a641f55187bd9fbb6c03ba5fafdaa)), closes [ipfs/js-ipfs#3591](https://github.com/ipfs/js-ipfs/issues/3591) [libp2p/js-libp2p-crypto#185](https://github.com/libp2p/js-libp2p-crypto/issues/185)
* go ed25519 interop ([2f18a07](https://github.com/libp2p/js-libp2p-crypto/commit/2f18a077b47ee84c450431f7431ecdfc913c8543))
* remove rendundant public key ([#181](https://github.com/libp2p/js-libp2p-crypto/issues/181)) ([afcffc8](https://github.com/libp2p/js-libp2p-crypto/commit/afcffc8115c8833edfe2a942d05547f418be5585))
* replace node buffers with uint8arrays ([#180](https://github.com/libp2p/js-libp2p-crypto/issues/180)) ([a0f387a](https://github.com/libp2p/js-libp2p-crypto/commit/a0f387aeab5dff45368341d0d80a5d1a25e9f849))


### Features

* add exporting/importing of non rsa keys in libp2p-key format ([#179](https://github.com/libp2p/js-libp2p-crypto/issues/179)) ([7273739](https://github.com/libp2p/js-libp2p-crypto/commit/7273739f045b33a46aae45f5003dd09f7ea6e37e))


### BREAKING CHANGES

* The private ed25519 key will no longer include the redundant public key

* chore: fix lint



<a name="0.19.2"></a>
## [0.19.2](https://github.com/libp2p/js-libp2p-crypto/compare/v0.19.1...v0.19.2) (2021-03-17)


### Bug Fixes

* ed25519 PeerID generation ([#186](https://github.com/libp2p/js-libp2p-crypto/issues/186)) ([1c16dd3](https://github.com/libp2p/js-libp2p-crypto/commit/1c16dd3)), closes [ipfs/js-ipfs#3591](https://github.com/ipfs/js-ipfs/issues/3591) [libp2p/js-libp2p-crypto#185](https://github.com/libp2p/js-libp2p-crypto/issues/185)



<a name="0.19.1"></a>
## [0.19.1](https://github.com/libp2p/js-libp2p-crypto/compare/v0.19.0...v0.19.1) (2021-03-15)


### Bug Fixes

* ed25519 key ID generation ([bc33769](https://github.com/libp2p/js-libp2p-crypto/commit/bc33769))



<a name="0.19.0"></a>
# [0.19.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.18.0...v0.19.0) (2021-01-15)



<a name="0.18.0"></a>
# [0.18.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.9...v0.18.0) (2020-08-07)


### Bug Fixes

* remove rendundant public key ([#181](https://github.com/libp2p/js-libp2p-crypto/issues/181)) ([afcffc8](https://github.com/libp2p/js-libp2p-crypto/commit/afcffc8))
* replace node buffers with uint8arrays ([#180](https://github.com/libp2p/js-libp2p-crypto/issues/180)) ([a0f387a](https://github.com/libp2p/js-libp2p-crypto/commit/a0f387a))


### BREAKING CHANGES

* The private ed25519 key will no longer include the redundant public key

* chore: fix lint
* - Where node Buffers were returned, now Uint8Arrays are

* chore: remove commented code



<a name="0.17.9"></a>
## [0.17.9](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.8...v0.17.9) (2020-08-05)


### Features

* add exporting/importing of non rsa keys in libp2p-key format ([#179](https://github.com/libp2p/js-libp2p-crypto/issues/179)) ([7273739](https://github.com/libp2p/js-libp2p-crypto/commit/7273739))



<a name="0.17.8"></a>
## [0.17.8](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.7...v0.17.8) (2020-07-20)


### Bug Fixes

* go ed25519 interop ([2f18a07](https://github.com/libp2p/js-libp2p-crypto/commit/2f18a07))



<a name="0.17.7"></a>
## [0.17.7](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.6...v0.17.7) (2020-06-09)



<a name="0.17.6"></a>
## [0.17.6](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.5...v0.17.6) (2020-04-07)


### Bug Fixes

* add buffer and update deps ([#25](https://github.com/libp2p/js-libp2p-crypto/issues/25)) ([35f196e](https://github.com/libp2p/js-libp2p-crypto/commit/35f196e))
* **unmarshal:** provide only one arg to callback ([#17](https://github.com/libp2p/js-libp2p-crypto/issues/17)) ([3bb8451](https://github.com/libp2p/js-libp2p-crypto/commit/3bb8451))
* circular circular dep -> DI ([0dcf1a6](https://github.com/libp2p/js-libp2p-crypto/commit/0dcf1a6))
* update deps and repo setup ([cfdcbe0](https://github.com/libp2p/js-libp2p-crypto/commit/cfdcbe0))


### Features

* add `id()` method to Secp256k1PrivateKey ([f4dbd62](https://github.com/libp2p/js-libp2p-crypto/commit/f4dbd62))
* initial implementation ([4c36aeb](https://github.com/libp2p/js-libp2p-crypto/commit/4c36aeb))
* next libp2p-crypto ([#4](https://github.com/libp2p/js-libp2p-crypto/issues/4)) ([4ee48a7](https://github.com/libp2p/js-libp2p-crypto/commit/4ee48a7))
* use async await ([#18](https://github.com/libp2p/js-libp2p-crypto/issues/18)) ([1974eb9](https://github.com/libp2p/js-libp2p-crypto/commit/1974eb9))


### BREAKING CHANGES

* Callback support has been dropped in favor of async/await.

* feat: use async/await

This PR changes this module to remove callbacks and use async/await. The API is unchanged aside from the obvious removal of the `callback` parameter.

refs https://github.com/ipfs/js-ipfs/issues/1670

* fix: use latest multihashing-async as it is all promises now



<a name="0.17.5"></a>
## [0.17.5](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.4...v0.17.5) (2020-03-24)



<a name="0.17.4"></a>
## [0.17.4](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.3...v0.17.4) (2020-03-23)


### Bug Fixes

* add buffer, cleanup, reduce size ([#170](https://github.com/libp2p/js-libp2p-crypto/issues/170)) ([c956d1a](https://github.com/libp2p/js-libp2p-crypto/commit/c956d1a))



<a name="0.17.3"></a>
## [0.17.3](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.2...v0.17.3) (2020-02-26)


### Performance Improvements

* remove asn1.js and use node-forge ([#166](https://github.com/libp2p/js-libp2p-crypto/issues/166)) ([00477e3](https://github.com/libp2p/js-libp2p-crypto/commit/00477e3))
* remove jwk2privPem and jwk2pubPem ([#162](https://github.com/libp2p/js-libp2p-crypto/issues/162)) ([cc20949](https://github.com/libp2p/js-libp2p-crypto/commit/cc20949))


### BREAKING CHANGES

* removes unused jwk2pem methods `jwk2pubPem` and `jwk2privPem`. These methods are not being used in any js libp2p modules, so only users referencing these directly will be impacted.



<a name="0.17.2"></a>
## [0.17.2](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.1...v0.17.2) (2020-01-17)


### Features

* add typescript types + linting/tests ([#161](https://github.com/libp2p/js-libp2p-crypto/issues/161)) ([e01977c](https://github.com/libp2p/js-libp2p-crypto/commit/e01977c))



<a name="0.17.1"></a>
## [0.17.1](https://github.com/libp2p/js-libp2p-crypto/compare/v0.17.0...v0.17.1) (2019-10-25)


### Bug Fixes

* better error for missing web crypto ([a5e0560](https://github.com/libp2p/js-libp2p-crypto/commit/a5e0560))
* browser rsa enc/dec ([b8e2414](https://github.com/libp2p/js-libp2p-crypto/commit/b8e2414))
* jwk var naming ([8b8d0c1](https://github.com/libp2p/js-libp2p-crypto/commit/8b8d0c1))
* lint ([2c294b5](https://github.com/libp2p/js-libp2p-crypto/commit/2c294b5))
* padding error ([2c1bac5](https://github.com/libp2p/js-libp2p-crypto/commit/2c1bac5))
* use direct buffers instead of converting to hex ([027a5a9](https://github.com/libp2p/js-libp2p-crypto/commit/027a5a9))


### Features

* add (rsa)pubKey.encrypt and (rsa)privKey.decrypt ([34c5f5c](https://github.com/libp2p/js-libp2p-crypto/commit/34c5f5c))
* browser enc/dec ([9f747a1](https://github.com/libp2p/js-libp2p-crypto/commit/9f747a1))
* use forge to convert jwk2forge ([b998f63](https://github.com/libp2p/js-libp2p-crypto/commit/b998f63))



<a name="0.17.0"></a>
# [0.17.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.16.1...v0.17.0) (2019-07-11)


### Bug Fixes

* **deps:** update to ursa-optiona@0.10 ([26b6217](https://github.com/libp2p/js-libp2p-crypto/commit/26b6217))
* fix links in README ([#148](https://github.com/libp2p/js-libp2p-crypto/issues/148)) ([5cd0e8c](https://github.com/libp2p/js-libp2p-crypto/commit/5cd0e8c))
* put optional args last for key export ([#154](https://github.com/libp2p/js-libp2p-crypto/issues/154)) ([d675670](https://github.com/libp2p/js-libp2p-crypto/commit/d675670))


### Features

* refactor to use async/await ([#131](https://github.com/libp2p/js-libp2p-crypto/issues/131)) ([ad71072](https://github.com/libp2p/js-libp2p-crypto/commit/ad71072))


### BREAKING CHANGES

* key export arguments are now swapped so that the optional format is last
* API refactored to use async/await

feat: WIP use async await
fix: passing tests
chore: update travis node.js versions
fix: skip ursa optional tests on windows
fix: benchmarks
docs: update docs
fix: remove broken and intested private key decrypt
chore: update deps



<a name="0.16.1"></a>
## [0.16.1](https://github.com/libp2p/js-libp2p-crypto/compare/v0.16.0...v0.16.1) (2019-02-26)



<a name="0.16.0"></a>
# [0.16.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.15.0...v0.16.0) (2019-01-08)


### Bug Fixes

* clean up, bundle size reduction ([8d8294d](https://github.com/libp2p/js-libp2p-crypto/commit/8d8294d))


### BREAKING CHANGES

* getRandomValues method exported from src/keys/rsa-browser.js and src/keys/rsa.js signature has changed from accepting an array to a number for random byte length 



<a name="0.15.0"></a>
# [0.15.0](https://github.com/libp2p/js-libp2p-crypto/compare/v0.14.1...v0.15.0) (2019-01-03)


### Features

* nextTick instead of setImmediate, and fix sync in async ([#136](https://github.com/libp2p/js-libp2p-crypto/issues/136)) ([c54ea20](https://github.com/libp2p/js-libp2p-crypto/commit/c54ea20))



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



