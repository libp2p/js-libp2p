## [3.1.5](https://github.com/libp2p/js-libp2p-multistream-select/compare/v3.1.4...v3.1.5) (2023-04-17)


### Bug Fixes

* use trace logging for happy paths ([#59](https://github.com/libp2p/js-libp2p-multistream-select/issues/59)) ([184ef21](https://github.com/libp2p/js-libp2p-multistream-select/commit/184ef21c930c1557d657ce0891471d86f76fb271))

## [3.1.4](https://github.com/libp2p/js-libp2p-multistream-select/compare/v3.1.3...v3.1.4) (2023-04-03)


### Dependencies

* update all it-* deps to the latest versions ([#57](https://github.com/libp2p/js-libp2p-multistream-select/issues/57)) ([cf9133a](https://github.com/libp2p/js-libp2p-multistream-select/commit/cf9133a00b73c9e6d7576b57d2dccd9e87ccd01e))

## [3.1.3](https://github.com/libp2p/js-libp2p-multistream-select/compare/v3.1.2...v3.1.3) (2023-03-31)


### Trivial Changes

* replace err-code with CodeError ([#36](https://github.com/libp2p/js-libp2p-multistream-select/issues/36)) ([fc2aefd](https://github.com/libp2p/js-libp2p-multistream-select/commit/fc2aefdec0db9a2b39fe8259881cf3a2693027cb)), closes [js-libp2p#1269](https://github.com/libp2p/js-libp2p/issues/1269)
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([1861a94](https://github.com/libp2p/js-libp2p-multistream-select/commit/1861a945fd8fef3d407591632d92f080d07e0bed))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([0f312c0](https://github.com/libp2p/js-libp2p-multistream-select/commit/0f312c08f3760f188304074088060f3d701e5815))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([6a277a6](https://github.com/libp2p/js-libp2p-multistream-select/commit/6a277a6efdcbd3afef72335699d3a61e4bbea609))


### Dependencies

* bump it-merge from 2.0.1 to 3.0.0 ([#51](https://github.com/libp2p/js-libp2p-multistream-select/issues/51)) ([129166b](https://github.com/libp2p/js-libp2p-multistream-select/commit/129166ba5366d29d20e2629ce1f542c57cc864ba))
* **dev:** bump it-all from 2.0.1 to 3.0.1 ([#50](https://github.com/libp2p/js-libp2p-multistream-select/issues/50)) ([d8420a0](https://github.com/libp2p/js-libp2p-multistream-select/commit/d8420a03207be7ee3472c4bb7a4f3cc0912758a1))

## [3.1.2](https://github.com/libp2p/js-libp2p-multistream-select/compare/v3.1.1...v3.1.2) (2022-12-16)


### Trivial Changes

* log invalid buffer ([#30](https://github.com/libp2p/js-libp2p-multistream-select/issues/30)) ([1fce957](https://github.com/libp2p/js-libp2p-multistream-select/commit/1fce9579eefe32a81b9805edc6a348f37605ac7f))
* update it-* deps ([#31](https://github.com/libp2p/js-libp2p-multistream-select/issues/31)) ([3caf904](https://github.com/libp2p/js-libp2p-multistream-select/commit/3caf904c20aab7dc4ca61f40420b18e84bbd2c49))


### Documentation

* publish api docs ([#35](https://github.com/libp2p/js-libp2p-multistream-select/issues/35)) ([c4c978a](https://github.com/libp2p/js-libp2p-multistream-select/commit/c4c978ac1eb84667d5568c5f68a6678cf460380f))

## [3.1.1](https://github.com/libp2p/js-libp2p-multistream-select/compare/v3.1.0...v3.1.1) (2022-10-31)


### Bug Fixes

* set min and max protocol length ([#21](https://github.com/libp2p/js-libp2p-multistream-select/issues/21)) ([ae42f76](https://github.com/libp2p/js-libp2p-multistream-select/commit/ae42f7623b557d33208c12c69d7f01e49f478fdb))


### Trivial Changes

* update to handshake 4.1.2 ([#28](https://github.com/libp2p/js-libp2p-multistream-select/issues/28)) ([53883b1](https://github.com/libp2p/js-libp2p-multistream-select/commit/53883b1c6215584043f4dd6e97e2d10adb890af6))

## [3.1.0](https://github.com/libp2p/js-libp2p-multistream-select/compare/v3.0.0...v3.1.0) (2022-10-12)


### Features

* add lazy select ([#18](https://github.com/libp2p/js-libp2p-multistream-select/issues/18)) ([d3bff7c](https://github.com/libp2p/js-libp2p-multistream-select/commit/d3bff7cc3cd5afe6ebc1355241030868ec0aa572))


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([ba9ea12](https://github.com/libp2p/js-libp2p-multistream-select/commit/ba9ea12b2b55602bbeb6c9227976419851496783))


### Dependencies

* bump uint8arrays from 3.x.x to 4.x.x ([#22](https://github.com/libp2p/js-libp2p-multistream-select/issues/22)) ([cfb887b](https://github.com/libp2p/js-libp2p-multistream-select/commit/cfb887b9bc01f8234838049c59866064db97bdf5))

## [3.0.0](https://github.com/libp2p/js-libp2p-multistream-select/compare/v2.0.2...v3.0.0) (2022-08-06)


### ⚠ BREAKING CHANGES

* the single-method Listener and Dialer classes have been removed and their methods exported instead

### Bug Fixes

* support Duplex<Uint8Array> and Duplex<Uint8ArrayList> ([#17](https://github.com/libp2p/js-libp2p-multistream-select/issues/17)) ([6e96c89](https://github.com/libp2p/js-libp2p-multistream-select/commit/6e96c89b68a77ea5192e91cab5547e78f5b078fd))

## [2.0.2](https://github.com/libp2p/js-libp2p-multistream-select/compare/v2.0.1...v2.0.2) (2022-07-31)


### Trivial Changes

* update project config ([#14](https://github.com/libp2p/js-libp2p-multistream-select/issues/14)) ([4d4ef28](https://github.com/libp2p/js-libp2p-multistream-select/commit/4d4ef28af8cb8d0f57e06d9ae161ba31e2c5e814))


### Dependencies

* update it-length-prefixed deps to support no-copy ops ([#16](https://github.com/libp2p/js-libp2p-multistream-select/issues/16)) ([2946064](https://github.com/libp2p/js-libp2p-multistream-select/commit/2946064a8993b4ec70ebfd3e5a34d86db1ee7fe6))

## [2.0.1](https://github.com/libp2p/js-libp2p-multistream-select/compare/v2.0.0...v2.0.1) (2022-06-17)


### Trivial Changes

* update deps ([#9](https://github.com/libp2p/js-libp2p-multistream-select/issues/9)) ([dc5ddc1](https://github.com/libp2p/js-libp2p-multistream-select/commit/dc5ddc1b93da82a98e5acddc25a8e41c6eb67044))

## [2.0.0](https://github.com/libp2p/js-libp2p-multistream-select/compare/v1.0.6...v2.0.0) (2022-06-15)


### ⚠ BREAKING CHANGES

* updates to single-issue libp2p interfaces and ls has been removed

### Features

* update interfaces, remove ls ([#3](https://github.com/libp2p/js-libp2p-multistream-select/issues/3)) ([1e6f3cd](https://github.com/libp2p/js-libp2p-multistream-select/commit/1e6f3cdffee6683786349142349a50872fa8fd17)), closes [#2](https://github.com/libp2p/js-libp2p-multistream-select/issues/2)

## [@libp2p/multistream-select-v1.0.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/multistream-select-v1.0.5...@libp2p/multistream-select-v1.0.6) (2022-05-24)


### Bug Fixes

* chunk data in mock muxer ([#218](https://github.com/libp2p/js-libp2p-interfaces/issues/218)) ([14604f6](https://github.com/libp2p/js-libp2p-interfaces/commit/14604f69a858bf8c16ce118420c5e49f3f5331ea))

## [@libp2p/multistream-select-v1.0.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/multistream-select-v1.0.4...@libp2p/multistream-select-v1.0.5) (2022-05-20)


### Bug Fixes

* update interfaces ([#215](https://github.com/libp2p/js-libp2p-interfaces/issues/215)) ([72e6890](https://github.com/libp2p/js-libp2p-interfaces/commit/72e6890826dadbd6e7cbba5536bde350ca4286e6))

## [@libp2p/multistream-select-v1.0.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/multistream-select-v1.0.3...@libp2p/multistream-select-v1.0.4) (2022-04-08)


### Bug Fixes

* swap protobufjs for protons ([#191](https://github.com/libp2p/js-libp2p-interfaces/issues/191)) ([d72b30c](https://github.com/libp2p/js-libp2p-interfaces/commit/d72b30cfca4b9145e0b31db28e8fa3329a180e83))


### Trivial Changes

* update aegir ([#192](https://github.com/libp2p/js-libp2p-interfaces/issues/192)) ([41c1494](https://github.com/libp2p/js-libp2p-interfaces/commit/41c14941e8b67d6601a90b4d48a2776573d55e60))

## [@libp2p/multistream-select-v1.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/multistream-select-v1.0.2...@libp2p/multistream-select-v1.0.3) (2022-03-15)


### Bug Fixes

* simplify transport interface, update interfaces for use with libp2p ([#180](https://github.com/libp2p/js-libp2p-interfaces/issues/180)) ([ec81622](https://github.com/libp2p/js-libp2p-interfaces/commit/ec81622e5b7c6d256e0f8aed6d3695642473293b))

## [@libp2p/multistream-select-v1.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/multistream-select-v1.0.1...@libp2p/multistream-select-v1.0.2) (2022-02-27)


### Bug Fixes

* rename crypto to connection-encrypter ([#179](https://github.com/libp2p/js-libp2p-interfaces/issues/179)) ([d197f55](https://github.com/libp2p/js-libp2p-interfaces/commit/d197f554d7cdadb3b05ed2d6c69fda2c4362b1eb))

## [@libp2p/multistream-select-v1.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/multistream-select-v1.0.0...@libp2p/multistream-select-v1.0.1) (2022-02-27)


### Bug Fixes

* update package config and add connection gater interface ([#178](https://github.com/libp2p/js-libp2p-interfaces/issues/178)) ([c6079a6](https://github.com/libp2p/js-libp2p-interfaces/commit/c6079a6367f004788062df3e30ad2e26330d947b))

## @libp2p/multistream-select-v1.0.0 (2022-02-17)


### Bug Fixes

* add multistream-select and update pubsub types ([#170](https://github.com/libp2p/js-libp2p-interfaces/issues/170)) ([b9ecb2b](https://github.com/libp2p/js-libp2p-interfaces/commit/b9ecb2bee8f2abc0c41bfcf7bf2025894e37ddc2))
