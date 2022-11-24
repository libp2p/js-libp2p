## [7.0.5](https://github.com/libp2p/js-libp2p-mplex/compare/v7.0.4...v7.0.5) (2022-11-24)


### Bug Fixes

* apply message size limit before decoding message ([#231](https://github.com/libp2p/js-libp2p-mplex/issues/231)) ([279ad47](https://github.com/libp2p/js-libp2p-mplex/commit/279ad47517ae3d4bc99ab499bf1fd9ef67dbb74b))
* limit unprocessed message queue size separately to message size ([#234](https://github.com/libp2p/js-libp2p-mplex/issues/234)) ([2297856](https://github.com/libp2p/js-libp2p-mplex/commit/2297856c3ffb05f9cabf52efc3b78ef96d3faf1e))
* yield single buffers ([#233](https://github.com/libp2p/js-libp2p-mplex/issues/233)) ([31d3938](https://github.com/libp2p/js-libp2p-mplex/commit/31d3938f8fcdf56debbf8824ccbcbc057d5bd5be))

## [7.0.4](https://github.com/libp2p/js-libp2p-mplex/compare/v7.0.3...v7.0.4) (2022-11-23)


### Dependencies

* **dev:** bump it-map from 1.0.6 to 2.0.0 ([#225](https://github.com/libp2p/js-libp2p-mplex/issues/225)) ([a153108](https://github.com/libp2p/js-libp2p-mplex/commit/a15310817a325b5106112562d82739d86fa50a49))


### Trivial Changes

* update benchmark ([#232](https://github.com/libp2p/js-libp2p-mplex/issues/232)) ([d73381e](https://github.com/libp2p/js-libp2p-mplex/commit/d73381e00b5109505a15b10512e52d17b4b78dd6))

## [7.0.3](https://github.com/libp2p/js-libp2p-mplex/compare/v7.0.2...v7.0.3) (2022-11-23)


### Dependencies

* **dev:** bump it-all from 1.0.6 to 2.0.0 ([#227](https://github.com/libp2p/js-libp2p-mplex/issues/227)) ([345b37d](https://github.com/libp2p/js-libp2p-mplex/commit/345b37d3668298ca7d55fbc7e7e12091add1a219))
* **dev:** bump it-foreach from 0.1.1 to 1.0.0 ([#226](https://github.com/libp2p/js-libp2p-mplex/issues/226)) ([01bae35](https://github.com/libp2p/js-libp2p-mplex/commit/01bae35a5c41346a945990be2618385bbea79572))

## [7.0.2](https://github.com/libp2p/js-libp2p-mplex/compare/v7.0.1...v7.0.2) (2022-11-23)


### Dependencies

* **dev:** bump it-drain from 1.0.5 to 2.0.0 ([#228](https://github.com/libp2p/js-libp2p-mplex/issues/228)) ([263251f](https://github.com/libp2p/js-libp2p-mplex/commit/263251fe3a4b8f55f6b4f431bdbfdb5b1006b42a))

## [7.0.1](https://github.com/libp2p/js-libp2p-mplex/compare/v7.0.0...v7.0.1) (2022-11-21)


### Bug Fixes

* type errors ([#230](https://github.com/libp2p/js-libp2p-mplex/issues/230)) ([e9c390a](https://github.com/libp2p/js-libp2p-mplex/commit/e9c390a195c46718e31e1f3bd233b0ab7c1f76b0))

## [7.0.0](https://github.com/libp2p/js-libp2p-mplex/compare/v6.0.2...v7.0.0) (2022-10-12)


### ⚠ BREAKING CHANGES

* modules no longer implement `Initializable` instead switching to constructor injection

### Bug Fixes

* remove @libp2p/components ([#223](https://github.com/libp2p/js-libp2p-mplex/issues/223)) ([9c9497f](https://github.com/libp2p/js-libp2p-mplex/commit/9c9497f5cb7a7fbe095d44d508a57a458dae9129))

## [6.0.2](https://github.com/libp2p/js-libp2p-mplex/compare/v6.0.1...v6.0.2) (2022-10-07)


### Dependencies

* bump @libp2p/interface-stream-muxer from 2.0.2 to 3.0.0 ([#220](https://github.com/libp2p/js-libp2p-mplex/issues/220)) ([5b45249](https://github.com/libp2p/js-libp2p-mplex/commit/5b452497d1f294ddf7c74283a16ea9e12f98c438))

## [6.0.1](https://github.com/libp2p/js-libp2p-mplex/compare/v6.0.0...v6.0.1) (2022-10-07)


### Dependencies

* **dev:** bump @libp2p/interface-stream-muxer-compliance-tests from 4.0.0 to 5.0.0 ([#221](https://github.com/libp2p/js-libp2p-mplex/issues/221)) ([1e3153e](https://github.com/libp2p/js-libp2p-mplex/commit/1e3153e3da749ce159708e838bc350f9b024a32b))

## [6.0.0](https://github.com/libp2p/js-libp2p-mplex/compare/v5.2.4...v6.0.0) (2022-10-07)


### ⚠ BREAKING CHANGES

* bump @libp2p/components from 2.1.1 to 3.0.0 (#222)

### Dependencies

* bump @libp2p/components from 2.1.1 to 3.0.0 ([#222](https://github.com/libp2p/js-libp2p-mplex/issues/222)) ([9b7a800](https://github.com/libp2p/js-libp2p-mplex/commit/9b7a80003f87c76df4d069d3e0d29c940a9237b2))

## [5.2.4](https://github.com/libp2p/js-libp2p-mplex/compare/v5.2.3...v5.2.4) (2022-09-23)


### Bug Fixes

* remove tracked map as the stats overwrite each other ([#217](https://github.com/libp2p/js-libp2p-mplex/issues/217)) ([d5f4d5f](https://github.com/libp2p/js-libp2p-mplex/commit/d5f4d5f6c92f2d6cc275d8a2250b1feb9b6b756f))


### Trivial Changes

* ignore coverage dir ([#219](https://github.com/libp2p/js-libp2p-mplex/issues/219)) ([298590f](https://github.com/libp2p/js-libp2p-mplex/commit/298590f839d147abc1f7168561a589b5977299ef))
* refactor benchmarks for use in the browser ([#218](https://github.com/libp2p/js-libp2p-mplex/issues/218)) ([ccd3dc7](https://github.com/libp2p/js-libp2p-mplex/commit/ccd3dc74289273135345005c6e64e2a3b4e48be7))

## [5.2.3](https://github.com/libp2p/js-libp2p-mplex/compare/v5.2.2...v5.2.3) (2022-09-20)


### Bug Fixes

* optimize stream sink for small messages ([#216](https://github.com/libp2p/js-libp2p-mplex/issues/216)) ([a10205b](https://github.com/libp2p/js-libp2p-mplex/commit/a10205bbf19db147a33201ba8fe1fc793661080d))


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([cf94f56](https://github.com/libp2p/js-libp2p-mplex/commit/cf94f56d82457f1c40e5d715d378216bb7d0ed5a))

## [5.2.2](https://github.com/libp2p/js-libp2p-mplex/compare/v5.2.1...v5.2.2) (2022-09-12)


### Bug Fixes

* chunk messages over maxMsgSize ([#214](https://github.com/libp2p/js-libp2p-mplex/issues/214)) ([6d2d8cc](https://github.com/libp2p/js-libp2p-mplex/commit/6d2d8ccf412b4937a955f567bd5f65705b9827a1))

## [5.2.1](https://github.com/libp2p/js-libp2p-mplex/compare/v5.2.0...v5.2.1) (2022-09-08)


### Bug Fixes

* do not treat stream source as pushable ([#211](https://github.com/libp2p/js-libp2p-mplex/issues/211)) ([359c103](https://github.com/libp2p/js-libp2p-mplex/commit/359c1038b870f84a9dfd390d4a0021c157fe0bcc))

## [5.2.0](https://github.com/libp2p/js-libp2p-mplex/compare/v5.1.2...v5.2.0) (2022-09-07)


### Features

* close connections when too many streams are opened ([#213](https://github.com/libp2p/js-libp2p-mplex/issues/213)) ([9140770](https://github.com/libp2p/js-libp2p-mplex/commit/9140770f4559677bbe69fc84d4d2dbcc70068c9e))

## [5.1.2](https://github.com/libp2p/js-libp2p-mplex/compare/v5.1.1...v5.1.2) (2022-09-07)


### Documentation

* make the example work ([#206](https://github.com/libp2p/js-libp2p-mplex/issues/206)) ([f07acc3](https://github.com/libp2p/js-libp2p-mplex/commit/f07acc361a0627ae848804ed6eb422efad70878f))

## [5.1.1](https://github.com/libp2p/js-libp2p-mplex/compare/v5.1.0...v5.1.1) (2022-08-30)


### Dependencies

* update it-pushable ([#210](https://github.com/libp2p/js-libp2p-mplex/issues/210)) ([1188272](https://github.com/libp2p/js-libp2p-mplex/commit/1188272df64c490449c1d3341e4c06c320116b30)), closes [#209](https://github.com/libp2p/js-libp2p-mplex/issues/209)

## [5.1.0](https://github.com/libp2p/js-libp2p-mplex/compare/v5.0.0...v5.1.0) (2022-08-30)


### Features

* add benchmark ([#207](https://github.com/libp2p/js-libp2p-mplex/issues/207)) ([6bf491f](https://github.com/libp2p/js-libp2p-mplex/commit/6bf491fdad73ee29849740754d5094bc85e26c78))

## [5.0.0](https://github.com/libp2p/js-libp2p-mplex/compare/v4.0.3...v5.0.0) (2022-08-10)


### ⚠ BREAKING CHANGES

* mulitplexed streams now emit `Uint8ArrayList`s and not `Uint8Array`s to handle the case for when transports have smaller chunk sizes than the multiplexer

### Bug Fixes

* emit uint8arraylists for data ([#201](https://github.com/libp2p/js-libp2p-mplex/issues/201)) ([e85ebab](https://github.com/libp2p/js-libp2p-mplex/commit/e85ebab233117643ba8b5acc33b7f90dc491f27d))

## [4.0.3](https://github.com/libp2p/js-libp2p-mplex/compare/v4.0.2...v4.0.3) (2022-08-03)


### Trivial Changes

* update project config ([#197](https://github.com/libp2p/js-libp2p-mplex/issues/197)) ([46334e6](https://github.com/libp2p/js-libp2p-mplex/commit/46334e6859cd17c47fe3ffcf2f194eb00f3e748a))


### Dependencies

* update uint8arraylist dep ([#199](https://github.com/libp2p/js-libp2p-mplex/issues/199)) ([6e3b9d8](https://github.com/libp2p/js-libp2p-mplex/commit/6e3b9d8b38d283e62103322f1173ccfed4db5a6a))

## [4.0.2](https://github.com/libp2p/js-libp2p-mplex/compare/v4.0.1...v4.0.2) (2022-07-25)


### Bug Fixes

* remove MPLEX_ prefix from error codes ([#195](https://github.com/libp2p/js-libp2p-mplex/issues/195)) ([c6c9581](https://github.com/libp2p/js-libp2p-mplex/commit/c6c9581b34259e1d3811a2edb91a1cc1ef854364))

## [4.0.1](https://github.com/libp2p/js-libp2p-mplex/compare/v4.0.0...v4.0.1) (2022-07-22)


### Bug Fixes

* remove need of buffer polyfill config for browser ([#194](https://github.com/libp2p/js-libp2p-mplex/issues/194)) ([7c39830](https://github.com/libp2p/js-libp2p-mplex/commit/7c39830280347dbcf976a921f677e7b0e725b9f7))
* reset stream when over inbound stream limit ([#193](https://github.com/libp2p/js-libp2p-mplex/issues/193)) ([41fefa4](https://github.com/libp2p/js-libp2p-mplex/commit/41fefa4280e122f553fed72ce5c81805755dcc35))

## [4.0.0](https://github.com/libp2p/js-libp2p-mplex/compare/v3.0.0...v4.0.0) (2022-06-28)


### ⚠ BREAKING CHANGES

* upgrade to interface-stream-muxer 2.0.0 (#186)

### Bug Fixes

* upgrade to interface-stream-muxer 2.0.0 ([#186](https://github.com/libp2p/js-libp2p-mplex/issues/186)) ([f11f2ce](https://github.com/libp2p/js-libp2p-mplex/commit/f11f2ce88f705d0836414fa3ddda1b08f046437c)), closes [#185](https://github.com/libp2p/js-libp2p-mplex/issues/185)

## [3.0.0](https://github.com/libp2p/js-libp2p-mplex/compare/v2.0.0...v3.0.0) (2022-06-17)


### ⚠ BREAKING CHANGES

* updates to simplified connection interface

### Bug Fixes

* limit incoming and outgoing streams separately ([#184](https://github.com/libp2p/js-libp2p-mplex/issues/184)) ([cd55d36](https://github.com/libp2p/js-libp2p-mplex/commit/cd55d36d4245868ebb884f0ce69fc6dfa5d8ca4b))

## [2.0.0](https://github.com/libp2p/js-libp2p-mplex/compare/v1.2.1...v2.0.0) (2022-06-15)


### ⚠ BREAKING CHANGES

* uses new single-issue libp2p interface modules

### Features

* update to latest interfaces ([#181](https://github.com/libp2p/js-libp2p-mplex/issues/181)) ([dcd02d9](https://github.com/libp2p/js-libp2p-mplex/commit/dcd02d9456f223c43062ac031c7a03aa6c635f30))

### [1.2.1](https://github.com/libp2p/js-libp2p-mplex/compare/v1.2.0...v1.2.1) (2022-06-13)


### Bug Fixes

* fix typo in error message ([#177](https://github.com/libp2p/js-libp2p-mplex/issues/177)) ([f71119d](https://github.com/libp2p/js-libp2p-mplex/commit/f71119d640ac8f3721ad1a87a5c4ccc8fc4bda1d))

## [1.2.0](https://github.com/libp2p/js-libp2p-mplex/compare/v1.1.2...v1.2.0) (2022-06-13)


### Features

* limit internal message buffer size ([#174](https://github.com/libp2p/js-libp2p-mplex/issues/174)) ([0c8e1b0](https://github.com/libp2p/js-libp2p-mplex/commit/0c8e1b06d31c46b6ef768139c822caac1904789d)), closes [/github.com/libp2p/go-mplex/blob/master/multiplex.go#L26](https://github.com/libp2p//github.com/libp2p/go-mplex/blob/master/multiplex.go/issues/L26)

### [1.1.2](https://github.com/libp2p/js-libp2p-mplex/compare/v1.1.1...v1.1.2) (2022-06-08)


### Bug Fixes

* add per-connection stream limit ([#173](https://github.com/libp2p/js-libp2p-mplex/issues/173)) ([21371e7](https://github.com/libp2p/js-libp2p-mplex/commit/21371e7251b1d5523d7e4e09afa9a2ea3daa8079))

### [1.1.1](https://github.com/libp2p/js-libp2p-mplex/compare/v1.1.0...v1.1.1) (2022-06-08)


### Bug Fixes

* re-enable encode from Uint8ArrayList test ([#172](https://github.com/libp2p/js-libp2p-mplex/issues/172)) ([897031f](https://github.com/libp2p/js-libp2p-mplex/commit/897031fa79cf5b8c2a746228341c8d31169c2af9))

## [1.1.0](https://github.com/libp2p/js-libp2p-mplex/compare/v1.0.5...v1.1.0) (2022-05-23)


### Features

* close read and write streams ([#170](https://github.com/libp2p/js-libp2p-mplex/issues/170)) ([3917968](https://github.com/libp2p/js-libp2p-mplex/commit/39179686ae033a2cc2821707dbec9e766fb4e099)), closes [#120](https://github.com/libp2p/js-libp2p-mplex/issues/120) [#115](https://github.com/libp2p/js-libp2p-mplex/issues/115)

### [1.0.5](https://github.com/libp2p/js-libp2p-mplex/compare/v1.0.4...v1.0.5) (2022-05-05)


### Bug Fixes

* ignore missing stream ([#169](https://github.com/libp2p/js-libp2p-mplex/issues/169)) ([f6d3dd9](https://github.com/libp2p/js-libp2p-mplex/commit/f6d3dd9f55020df93c8e7e116cb2ce1614b3404b))

### [1.0.4](https://github.com/libp2p/js-libp2p-mplex/compare/v1.0.3...v1.0.4) (2022-05-04)


### Bug Fixes

* update interfaces ([#168](https://github.com/libp2p/js-libp2p-mplex/issues/168)) ([f592f96](https://github.com/libp2p/js-libp2p-mplex/commit/f592f96adb6527da633fdc235890e32e53625906))

### [1.0.3](https://github.com/libp2p/js-libp2p-mplex/compare/v1.0.2...v1.0.3) (2022-04-09)


### Trivial Changes

* update aegir ([#167](https://github.com/libp2p/js-libp2p-mplex/issues/167)) ([0ef0c36](https://github.com/libp2p/js-libp2p-mplex/commit/0ef0c36f4d84d85ddbc06b725967bd9edac7a1cc))

### [1.0.2](https://github.com/libp2p/js-libp2p-mplex/compare/v1.0.1...v1.0.2) (2022-03-17)


### Bug Fixes

* update interfaces ([#162](https://github.com/libp2p/js-libp2p-mplex/issues/162)) ([ab9079c](https://github.com/libp2p/js-libp2p-mplex/commit/ab9079c26a5c98ea5487107e79bbf17ae9b34ad2))

### [1.0.1](https://github.com/libp2p/js-libp2p-mplex/compare/v1.0.0...v1.0.1) (2022-02-21)


### Bug Fixes

* update interfaces ([#160](https://github.com/libp2p/js-libp2p-mplex/issues/160)) ([43db1cb](https://github.com/libp2p/js-libp2p-mplex/commit/43db1cb61440859abc2cdefe5a9a362d0bf19497))


### Trivial Changes

* module name ([0137b94](https://github.com/libp2p/js-libp2p-mplex/commit/0137b9451e554a32d7e1f1c10eaacc00df225762))

## [1.0.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.7...v1.0.0) (2022-02-14)


### ⚠ BREAKING CHANGES

* switch to named exports, ESM only

Co-authored-by: Marin Petrunić <mpetrunic@users.noreply.github.com>

### Features

* convert to typescript ([#158](https://github.com/libp2p/js-libp2p-mplex/issues/158)) ([0cf727a](https://github.com/libp2p/js-libp2p-mplex/commit/0cf727ae101b3006400701b781d05a12eada59b7))

### [0.10.7](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.6...v0.10.7) (2022-01-14)


### Bug Fixes

* remove abort controller dep ([#152](https://github.com/libp2p/js-libp2p-mplex/issues/152)) ([96943cb](https://github.com/libp2p/js-libp2p-mplex/commit/96943cb68bc01efffd7045f0c5a9a3ed978fbf0e))

### [0.10.6](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.5...v0.10.6) (2022-01-14)


### Trivial Changes

* switch to unified ci ([#151](https://github.com/libp2p/js-libp2p-mplex/issues/151)) ([f14c349](https://github.com/libp2p/js-libp2p-mplex/commit/f14c34974c8b298179782f5ce3de93fb439fd764))

## [0.10.5](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.4...v0.10.5) (2021-12-07)


### Performance Improvements

* do not call varint.decode() if buffer has 0 length ([#125](https://github.com/libp2p/js-libp2p-mplex/issues/125)) ([92f1727](https://github.com/libp2p/js-libp2p-mplex/commit/92f1727342c278a8dd025623cc4fe6cb265485e9))



## [0.10.4](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.3...v0.10.4) (2021-07-08)



## [0.10.3](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.2...v0.10.3) (2021-04-16)



## [0.10.2](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.5...v0.10.2) (2021-01-29)


### Bug Fixes

* ensure stream closes on abort or reset ([#116](https://github.com/libp2p/js-libp2p-mplex/issues/116)) ([77835b3](https://github.com/libp2p/js-libp2p-mplex/commit/77835b326fbce02e3a9bf92f0084d01e4e1d9cf9))
* replace node buffers with uint8arrays ([#114](https://github.com/libp2p/js-libp2p-mplex/issues/114)) ([d005338](https://github.com/libp2p/js-libp2p-mplex/commit/d005338154b6882a22396e921ba4a38cc4e213fc))


### BREAKING CHANGES

* - All use of node Buffers has been replaced with Uint8Arrays

* fix: keep allocUnsafe for node for performance

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



## [0.10.1](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.0...v0.10.1) (2020-10-22)


### Bug Fixes

* ensure stream closes on abort or reset ([#116](https://github.com/libp2p/js-libp2p-mplex/issues/116)) ([77835b3](https://github.com/libp2p/js-libp2p-mplex/commit/77835b326fbce02e3a9bf92f0084d01e4e1d9cf9))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.5...v0.10.0) (2020-08-11)


### Bug Fixes

* replace node buffers with uint8arrays ([#114](https://github.com/libp2p/js-libp2p-mplex/issues/114)) ([d005338](https://github.com/libp2p/js-libp2p-mplex/commit/d005338))


### BREAKING CHANGES

* - All use of node Buffers has been replaced with Uint8Arrays

* fix: keep allocUnsafe for node for performance

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



<a name="0.9.5"></a>
## [0.9.5](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.4...v0.9.5) (2020-03-18)


### Bug Fixes

* add buffer ([#106](https://github.com/libp2p/js-libp2p-mplex/issues/106)) ([71f3e5b](https://github.com/libp2p/js-libp2p-mplex/commit/71f3e5b))



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.3...v0.9.4) (2020-02-13)


### Performance Improvements

* small bl ([#101](https://github.com/libp2p/js-libp2p-mplex/issues/101)) ([7da79b6](https://github.com/libp2p/js-libp2p-mplex/commit/7da79b6))



<a name="0.9.3"></a>
## [0.9.3](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.2...v0.9.3) (2019-11-28)


### Features

* message splitting ([#100](https://github.com/libp2p/js-libp2p-mplex/issues/100)) ([fba56a5](https://github.com/libp2p/js-libp2p-mplex/commit/fba56a5))



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.1...v0.9.2) (2019-10-28)



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.0...v0.9.1) (2019-09-23)


### Features

* add better support for external stream metadata tracking ([#98](https://github.com/libp2p/js-libp2p-mplex/issues/98)) ([96f1ca0](https://github.com/libp2p/js-libp2p-mplex/commit/96f1ca0))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.5...v0.9.0) (2019-09-18)


### Code Refactoring

* async iterators ([#94](https://github.com/libp2p/js-libp2p-mplex/issues/94)) ([c9bede5](https://github.com/libp2p/js-libp2p-mplex/commit/c9bede5))


### BREAKING CHANGES

* All places in the API that used callbacks are now replaced with async/await while pull-streams are replaced with async iterators. The API has also been updated according to the latest `interface-stream-muxer` version, https://github.com/libp2p/interface-stream-muxer/tree/v0.7.0.

License: MIT
Signed-off-by: Alan Shaw <alan.shaw@protocol.ai>



<a name="0.8.5"></a>
## [0.8.5](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.4...v0.8.5) (2019-03-18)



<a name="0.8.4"></a>
## [0.8.4](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.3...v0.8.4) (2018-11-15)



<a name="0.8.3"></a>
## [0.8.3](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.2...v0.8.3) (2018-11-08)


### Bug Fixes

* muxer.end will no longer hang ([#86](https://github.com/libp2p/js-libp2p-mplex/issues/86)) ([e23cbaf](https://github.com/libp2p/js-libp2p-mplex/commit/e23cbaf))



<a name="0.8.2"></a>
## [0.8.2](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.1...v0.8.2) (2018-10-01)


### Bug Fixes

* improve resiliency of internals _send ([#84](https://github.com/libp2p/js-libp2p-mplex/issues/84)) ([70dafb7](https://github.com/libp2p/js-libp2p-mplex/commit/70dafb7))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.0...v0.8.1) (2018-10-01)


### Bug Fixes

* verify drain before new push ([#82](https://github.com/libp2p/js-libp2p-mplex/issues/82)) ([cd77e01](https://github.com/libp2p/js-libp2p-mplex/commit/cd77e01))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.7.0...v0.8.0) (2018-06-19)


### Bug Fixes

* add setImmediatte to the call of callback ([8cdcd0d](https://github.com/libp2p/js-libp2p-mplex/commit/8cdcd0d))
* catch Multiplexer is destroyed error into callback ([#79](https://github.com/libp2p/js-libp2p-mplex/issues/79)) ([b60205f](https://github.com/libp2p/js-libp2p-mplex/commit/b60205f))
* missing dep and readme example ([#77](https://github.com/libp2p/js-libp2p-mplex/issues/77)) ([904cd7c](https://github.com/libp2p/js-libp2p-mplex/commit/904cd7c))
* package.json deps semver ([126b966](https://github.com/libp2p/js-libp2p-mplex/commit/126b966))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.6.0...v0.7.0) (2018-04-05)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.5.1...v0.6.0) (2018-02-19)


### Features

* mplex is all here ([20cf80a](https://github.com/libp2p/js-libp2p-mplex/commit/20cf80a))
* support new Buffer ([c1384c3](https://github.com/libp2p/js-libp2p-mplex/commit/c1384c3))



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.5.0...v0.5.1) (2017-12-14)


### Features

* porting to new aegir ([#70](https://github.com/libp2p/js-libp2p-multiplex/issues/70)) ([30fc825](https://github.com/libp2p/js-libp2p-multiplex/commit/30fc825))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.4...v0.5.0) (2017-09-03)


### Features

* p2p addrs situation ([#69](https://github.com/libp2p/js-libp2p-multiplex/issues/69)) ([d58f50e](https://github.com/libp2p/js-libp2p-multiplex/commit/d58f50e))



<a name="0.4.4"></a>
## [0.4.4](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.3...v0.4.4) (2017-07-08)



<a name="0.4.3"></a>
## [0.4.3](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.2...v0.4.3) (2017-03-21)



<a name="0.4.2"></a>
## [0.4.2](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.1...v0.4.2) (2017-03-21)


### Bug Fixes

* add missing setImmediate shim ([b039b81](https://github.com/libp2p/js-libp2p-multiplex/commit/b039b81)), closes [#61](https://github.com/libp2p/js-libp2p-multiplex/issues/61)



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.0...v0.4.1) (2017-02-21)


### Bug Fixes

* correct handling of multiplex options ([fa78df4](https://github.com/libp2p/js-libp2p-multiplex/commit/fa78df4))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.6...v0.4.0) (2017-02-15)



<a name="0.3.6"></a>
## [0.3.6](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.5...v0.3.6) (2017-02-09)



<a name="0.3.5"></a>
## [0.3.5](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.4...v0.3.5) (2017-01-26)



<a name="0.3.4"></a>
## [0.3.4](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.3...v0.3.4) (2017-01-24)



<a name="0.3.3"></a>
## [0.3.3](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.2...v0.3.3) (2017-01-24)


### Bug Fixes

* check for callbacks ([9ef5553](https://github.com/libp2p/js-libp2p-multiplex/commit/9ef5553))



<a name="0.3.2"></a>
## [0.3.2](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.1...v0.3.2) (2017-01-24)


### Bug Fixes

* dropped packed ([a7cfb8b](https://github.com/libp2p/js-libp2p-multiplex/commit/a7cfb8b))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.0...v0.3.1) (2017-01-20)


### Bug Fixes

* **docs:** Update readme.md's example and added files for it ([ccd94c8](https://github.com/libp2p/js-libp2p-multiplex/commit/ccd94c8))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.2.1...v0.3.0) (2017-01-20)



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.2.0...v0.2.1) (2016-03-22)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.1.0...v0.2.0) (2016-03-07)



<a name="0.1.0"></a>
# 0.1.0 (2016-03-07)
