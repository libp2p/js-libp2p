## [8.0.1](https://github.com/ChainSafe/js-libp2p-yamux/compare/v8.0.0...v8.0.1) (2025-10-15)

### Bug Fixes

* make sendReset synchronous to avoid unhandled rejections ([#113](https://github.com/ChainSafe/js-libp2p-yamux/issues/113)) ([232fb1b](https://github.com/ChainSafe/js-libp2p-yamux/commit/232fb1b6aec679d61a31f4b97deeed135ef6f5c4))

## [8.0.0](https://github.com/ChainSafe/js-libp2p-yamux/compare/v7.0.4...v8.0.0) (2025-09-25)

### ⚠ BREAKING CHANGES

* Must be used with `libp2p@3.x.x`, it cannot be used with earlier versions

### Features

* update to libp2p v3 api ([#105](https://github.com/ChainSafe/js-libp2p-yamux/issues/105)) ([bc5e09e](https://github.com/ChainSafe/js-libp2p-yamux/commit/bc5e09ebd207b8bc3a6154accef0a59e6c6f1792))

## [7.0.4](https://github.com/ChainSafe/js-libp2p-yamux/compare/v7.0.3...v7.0.4) (2025-06-25)

### Dependencies

* **dev:** bump @dapplion/benchmark from 0.2.5 to 1.0.0 ([#97](https://github.com/ChainSafe/js-libp2p-yamux/issues/97)) ([844c13e](https://github.com/ChainSafe/js-libp2p-yamux/commit/844c13ec60efb0f3b763630a7769f6377fe21e40))

## [7.0.3](https://github.com/ChainSafe/js-libp2p-yamux/compare/v7.0.2...v7.0.3) (2025-06-25)

### Bug Fixes

* keep-alive memory leak ([#102](https://github.com/ChainSafe/js-libp2p-yamux/issues/102)) ([b470fc6](https://github.com/ChainSafe/js-libp2p-yamux/commit/b470fc6e1bb838677ebcb24fff72930a609aa88b))

## [7.0.2](https://github.com/ChainSafe/js-libp2p-yamux/compare/v7.0.1...v7.0.2) (2025-06-18)

### Dependencies

* **dev:** bump aegir from 44.1.4 to 45.0.8 ([#98](https://github.com/ChainSafe/js-libp2p-yamux/issues/98)) ([1f97536](https://github.com/ChainSafe/js-libp2p-yamux/commit/1f97536483b758f988fc716f190a3d8d6253ed3b))

## [7.0.1](https://github.com/ChainSafe/js-libp2p-yamux/compare/v7.0.0...v7.0.1) (2024-09-25)

### Bug Fixes

* switch missing stream log to trace ([#90](https://github.com/ChainSafe/js-libp2p-yamux/issues/90)) ([96bfe96](https://github.com/ChainSafe/js-libp2p-yamux/commit/96bfe96d6df52d0b9ea55a87ac8c1f87fdd50a6b))

## [7.0.0](https://github.com/ChainSafe/js-libp2p-yamux/compare/v6.0.2...v7.0.0) (2024-09-11)

### ⚠ BREAKING CHANGES

* requires libp2p@2.x.x

### Features

* add service capabilities definition ([#79](https://github.com/ChainSafe/js-libp2p-yamux/issues/79)) ([0aff43d](https://github.com/ChainSafe/js-libp2p-yamux/commit/0aff43dfb6bc6b4b78ccff9f9186ef65b6a5bbe6))

### Bug Fixes

* upgrade to libp2p@2.x.x ([#84](https://github.com/ChainSafe/js-libp2p-yamux/issues/84)) ([47556c0](https://github.com/ChainSafe/js-libp2p-yamux/commit/47556c0f2c9da48ef8b40cb2fb03431a9c6ae5c9))

### Trivial Changes

* bump aegir from 42.2.11 to 43.0.1 ([#78](https://github.com/ChainSafe/js-libp2p-yamux/issues/78)) ([46af2f8](https://github.com/ChainSafe/js-libp2p-yamux/commit/46af2f8ca49f1a60ae965b70ace6a856c6d03ecc))
* update aegir to 42.x.x ([#74](https://github.com/ChainSafe/js-libp2p-yamux/issues/74)) ([87b4db9](https://github.com/ChainSafe/js-libp2p-yamux/commit/87b4db9a8deb300cb2ba6efe09b0cc13a08c90b3))
* update project config ([ca413ad](https://github.com/ChainSafe/js-libp2p-yamux/commit/ca413ad236e76b836f6c3d2613c0ccc678b29fbd))

### Dependencies

* **dev:** bump aegir from 43.0.3 to 44.1.1 ([#83](https://github.com/ChainSafe/js-libp2p-yamux/issues/83)) ([0a8b06f](https://github.com/ChainSafe/js-libp2p-yamux/commit/0a8b06fdc8d6f3d83dfd2d25b8c6a614ceeefc38))

## [6.0.2](https://github.com/ChainSafe/js-libp2p-yamux/compare/v6.0.1...v6.0.2) (2024-02-08)


### Bug Fixes

* send data during graceful close ([#75](https://github.com/ChainSafe/js-libp2p-yamux/issues/75)) ([f77b9ec](https://github.com/ChainSafe/js-libp2p-yamux/commit/f77b9ec7118720d23073bbfcd96504c0a179f4b2))
* send data during graceful close. ([#73](https://github.com/ChainSafe/js-libp2p-yamux/issues/73)) ([f5d92da](https://github.com/ChainSafe/js-libp2p-yamux/commit/f5d92da81cefe2edbf504c187d87bd9dde357005))

## [6.0.1](https://github.com/ChainSafe/js-libp2p-yamux/compare/v6.0.0...v6.0.1) (2023-11-30)


### Bug Fixes

* update interface import path ([#68](https://github.com/ChainSafe/js-libp2p-yamux/issues/68)) ([bfad61c](https://github.com/ChainSafe/js-libp2p-yamux/commit/bfad61cf1e7293c5f7e2bb5db35bb62a17b34d48))

## [6.0.0](https://github.com/ChainSafe/js-libp2p-yamux/compare/v5.0.4...v6.0.0) (2023-11-29)


### ⚠ BREAKING CHANGES

* yield uint8arraylists (#65)

### Features

* yield uint8arraylists ([#65](https://github.com/ChainSafe/js-libp2p-yamux/issues/65)) ([9ffc44d](https://github.com/ChainSafe/js-libp2p-yamux/commit/9ffc44dd2d924562da02a616f601b21bf9c13858))

## [5.0.4](https://github.com/ChainSafe/js-libp2p-yamux/compare/v5.0.3...v5.0.4) (2023-11-29)


### Dependencies

* **dev:** update aegir to 41.x.x ([#67](https://github.com/ChainSafe/js-libp2p-yamux/issues/67)) ([f2492e9](https://github.com/ChainSafe/js-libp2p-yamux/commit/f2492e9ea8a8387d9f6aea36321afd690521e538))

## [5.0.3](https://github.com/ChainSafe/js-libp2p-yamux/compare/v5.0.2...v5.0.3) (2023-11-14)


### Bug Fixes

* establish RTT at start of connection ([#64](https://github.com/ChainSafe/js-libp2p-yamux/issues/64)) ([672523b](https://github.com/ChainSafe/js-libp2p-yamux/commit/672523bcf0c4c2ccfaf27b6b06e07f28294f0077))

## [5.0.2](https://github.com/ChainSafe/js-libp2p-yamux/compare/v5.0.1...v5.0.2) (2023-11-12)


### Bug Fixes

* remove abortable iterator from muxer ([#63](https://github.com/ChainSafe/js-libp2p-yamux/issues/63)) ([064bf1c](https://github.com/ChainSafe/js-libp2p-yamux/commit/064bf1cc56bc4bdaa0f950a1f434f25c66e036a9))

## [5.0.1](https://github.com/ChainSafe/js-libp2p-yamux/compare/v5.0.0...v5.0.1) (2023-11-12)


### Bug Fixes

* do not stringify headers for logging ([#61](https://github.com/ChainSafe/js-libp2p-yamux/issues/61)) ([59e73d8](https://github.com/ChainSafe/js-libp2p-yamux/commit/59e73d8bd5db59ec2b606a37f19b30d801dcf80a))
* silence max listeners exceeded warning ([#62](https://github.com/ChainSafe/js-libp2p-yamux/issues/62)) ([cce9446](https://github.com/ChainSafe/js-libp2p-yamux/commit/cce94469cbdac581baf0375b88aa6d38b0778a88))

## [5.0.0](https://github.com/ChainSafe/js-libp2p-yamux/compare/v4.0.2...v5.0.0) (2023-08-03)


### ⚠ BREAKING CHANGES

* stream close methods are now asyc, requires libp2p@0.46.x or later

* chore: pr comments

* chore: remove readState/writeState as they are not used any more

### Features

* close streams gracefully ([#57](https://github.com/ChainSafe/js-libp2p-yamux/issues/57)) ([2bd88a8](https://github.com/ChainSafe/js-libp2p-yamux/commit/2bd88a8a8ec123bd220fad450645f61aea44258a))

## [4.0.2](https://github.com/ChainSafe/js-libp2p-yamux/compare/v4.0.1...v4.0.2) (2023-05-17)


### Bug Fixes

* improve decode performance with subarray ([#49](https://github.com/ChainSafe/js-libp2p-yamux/issues/49)) ([684de7c](https://github.com/ChainSafe/js-libp2p-yamux/commit/684de7cd5f8614ab34122c3f4bb6671c9288618c))


### Dependencies

* upgrade deps ([#52](https://github.com/ChainSafe/js-libp2p-yamux/issues/52)) ([d00570c](https://github.com/ChainSafe/js-libp2p-yamux/commit/d00570c9313c7f141559827be58f122db719dbaf))

## [4.0.1](https://github.com/ChainSafe/js-libp2p-yamux/compare/v4.0.0...v4.0.1) (2023-05-01)


### Bug Fixes

* updated reset for abort controller ([#26](https://github.com/ChainSafe/js-libp2p-yamux/issues/26)) ([6fc5ebd](https://github.com/ChainSafe/js-libp2p-yamux/commit/6fc5ebd6296286e40f761271f42c60d70b729b14))

## [4.0.0](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.10...v4.0.0) (2023-04-19)


### ⚠ BREAKING CHANGES

* the type of the source/sink properties have changed

### Dependencies

* update to new stream type deps ([#36](https://github.com/ChainSafe/js-libp2p-yamux/issues/36)) ([a2d841d](https://github.com/ChainSafe/js-libp2p-yamux/commit/a2d841d7e5bac4a5659bdbe98e962bcaab61ed65))

## [3.0.10](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.9...v3.0.10) (2023-04-16)


### Bug Fixes

* use trace logging for happy paths ([#35](https://github.com/ChainSafe/js-libp2p-yamux/issues/35)) ([2c64584](https://github.com/ChainSafe/js-libp2p-yamux/commit/2c64584bc20692ab9bad7d96621579c8f1c9fc6f))

## [3.0.9](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.8...v3.0.9) (2023-04-13)


### Dependencies

* bump @libp2p/interface-connection from 3.1.1 to 4.0.0 ([#32](https://github.com/ChainSafe/js-libp2p-yamux/issues/32)) ([e8ac91d](https://github.com/ChainSafe/js-libp2p-yamux/commit/e8ac91d6ba448cba75adc43a4fc580e46129398f))
* bump it-pipe from 2.0.5 to 3.0.1 ([#30](https://github.com/ChainSafe/js-libp2p-yamux/issues/30)) ([e396e6e](https://github.com/ChainSafe/js-libp2p-yamux/commit/e396e6ed68e7cccf9a3e58e793ca91d94ad35e3e))

## [3.0.8](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.7...v3.0.8) (2023-04-13)


### Dependencies

* update any-signal to 4.x.x ([#33](https://github.com/ChainSafe/js-libp2p-yamux/issues/33)) ([5f3e5aa](https://github.com/ChainSafe/js-libp2p-yamux/commit/5f3e5aad85b659cb18a0e901e10e3f0466bedd6b))

## [3.0.7](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.6...v3.0.7) (2023-03-01)


### Bug Fixes

* catch stream sink errors ([#25](https://github.com/ChainSafe/js-libp2p-yamux/issues/25)) ([7c7fd07](https://github.com/ChainSafe/js-libp2p-yamux/commit/7c7fd07338379d57b6d0bd1dde12e36797cf3c50))

## [3.0.6](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.5...v3.0.6) (2023-02-24)


### Dependencies

* **dev:** bump it-pair from 2.0.3 to 2.0.4 ([#22](https://github.com/ChainSafe/js-libp2p-yamux/issues/22)) ([f908735](https://github.com/ChainSafe/js-libp2p-yamux/commit/f908735bbbd921b0806ffe4a3cec6176662e1f3c))

## [3.0.5](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.4...v3.0.5) (2023-01-16)


### Dependencies

* **dev:** bump aegir from 37.12.1 to 38.1.0 ([#20](https://github.com/ChainSafe/js-libp2p-yamux/issues/20)) ([0cf9a86](https://github.com/ChainSafe/js-libp2p-yamux/commit/0cf9a865bff5f82b3fe03bf2a718b22f1cd1ef5d))


### Trivial Changes

* replace err-code with CodeError ([#21](https://github.com/ChainSafe/js-libp2p-yamux/issues/21)) ([8c2ba01](https://github.com/ChainSafe/js-libp2p-yamux/commit/8c2ba01f5dbeb736e94cf6df3ab140494a2b184d))

## [3.0.4](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.3...v3.0.4) (2023-01-06)


### Bug Fixes

* remove unused deps ([#19](https://github.com/ChainSafe/js-libp2p-yamux/issues/19)) ([beb4707](https://github.com/ChainSafe/js-libp2p-yamux/commit/beb47073fc1f919def45db262ed58f7d1f3a7a96))

## [3.0.3](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.2...v3.0.3) (2022-11-05)


### Bug Fixes

* remove metrics from component ([#17](https://github.com/ChainSafe/js-libp2p-yamux/issues/17)) ([c396f8c](https://github.com/ChainSafe/js-libp2p-yamux/commit/c396f8c1b99f3c68104c894a1ac88a805bff68a3))

## [3.0.2](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.1...v3.0.2) (2022-10-17)


### Dependencies

* **dev:** bump @libp2p/mplex from 6.0.2 to 7.0.0 ([#14](https://github.com/ChainSafe/js-libp2p-yamux/issues/14)) ([4085a05](https://github.com/ChainSafe/js-libp2p-yamux/commit/4085a05d169b6aea212f995044512ee011e15e07))

## [3.0.1](https://github.com/ChainSafe/js-libp2p-yamux/compare/v3.0.0...v3.0.1) (2022-10-17)


### Dependencies

* **dev:** bump @libp2p/interface-stream-muxer-compliance-tests from 5.0.0 to 6.0.0 ([#15](https://github.com/ChainSafe/js-libp2p-yamux/issues/15)) ([b6a02d1](https://github.com/ChainSafe/js-libp2p-yamux/commit/b6a02d1613df746f626ea75bfa3b9d601d34e071))
* **dev:** bump it-drain from 1.0.5 to 2.0.0 ([#16](https://github.com/ChainSafe/js-libp2p-yamux/issues/16)) ([399a49c](https://github.com/ChainSafe/js-libp2p-yamux/commit/399a49ce7b539ab5643491938cb13cb1857a2bc1))

## [3.0.0](https://github.com/ChainSafe/js-libp2p-yamux/compare/v2.0.0...v3.0.0) (2022-10-12)


### ⚠ BREAKING CHANGES

* modules no longer implement `Initializable` instead switching to constructor injection

### Bug Fixes

* remove @libp2p/components ([#13](https://github.com/ChainSafe/js-libp2p-yamux/issues/13)) ([3fafe00](https://github.com/ChainSafe/js-libp2p-yamux/commit/3fafe0053c6e752e86d0c68549a62b231b16d4ac))

## [2.0.0](https://github.com/ChainSafe/js-libp2p-yamux/compare/v1.0.1...v2.0.0) (2022-10-07)


### ⚠ BREAKING CHANGES

* **deps:** bump @libp2p/interface-stream-muxer from 2.0.2 to 3.0.0 (#9)
* **deps:** bump @libp2p/components from 2.1.1 to 3.0.0 (#7)

### Bug Fixes

* update project config ([#10](https://github.com/ChainSafe/js-libp2p-yamux/issues/10)) ([b752604](https://github.com/ChainSafe/js-libp2p-yamux/commit/b752604f371a51d7efe02fea499a8e8c4f4e435c))


### Trivial Changes

* **deps-dev:** bump @libp2p/interface-stream-muxer-compliance-tests from 4.0.0 to 5.0.0 ([#8](https://github.com/ChainSafe/js-libp2p-yamux/issues/8)) ([af8c3ae](https://github.com/ChainSafe/js-libp2p-yamux/commit/af8c3ae6b708ed43b02f7021e19ae10466653a5e))
* **deps:** bump @libp2p/components from 2.1.1 to 3.0.0 ([#7](https://github.com/ChainSafe/js-libp2p-yamux/issues/7)) ([2c31bce](https://github.com/ChainSafe/js-libp2p-yamux/commit/2c31bceffdb120d044a4bfd612c94f3d28ff8540))
* **deps:** bump @libp2p/interface-stream-muxer from 2.0.2 to 3.0.0 ([#9](https://github.com/ChainSafe/js-libp2p-yamux/issues/9)) ([3235d5f](https://github.com/ChainSafe/js-libp2p-yamux/commit/3235d5fbf1fe91e0a6ec8d8356c97951d261b931))
