## [2.0.2](https://github.com/libp2p/js-libp2p-webtransport/compare/v2.0.1...v2.0.2) (2023-06-15)


### Trivial Changes

* Update .github/workflows/semantic-pull-request.yml [skip ci] ([56ef477](https://github.com/libp2p/js-libp2p-webtransport/commit/56ef477cff1214bebb150414ad6db36174ee0fa1))
* Update .github/workflows/stale.yml [skip ci] ([cdbdfd4](https://github.com/libp2p/js-libp2p-webtransport/commit/cdbdfd4dc50a5e2bd3729938786a427ae7802f75))


### Dependencies

* bump @chainsafe/libp2p-noise from 11.0.4 to 12.0.1 ([#80](https://github.com/libp2p/js-libp2p-webtransport/issues/80)) ([599dab1](https://github.com/libp2p/js-libp2p-webtransport/commit/599dab1b4f6ae816b0c0feefc926c1b38d24b676))

### [3.0.5](https://www.github.com/libp2p/js-libp2p/compare/webtransport-v3.0.4...webtransport-v3.0.5) (2023-08-16)


### Bug Fixes

* **@libp2p/webtransport:** be more thorough about closing sessions ([#1969](https://www.github.com/libp2p/js-libp2p/issues/1969)) ([90e793e](https://www.github.com/libp2p/js-libp2p/commit/90e793eb2ec2c18bbca9416df92d824b5ebbccb4)), closes [#1896](https://www.github.com/libp2p/js-libp2p/issues/1896)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * libp2p bumped from ^0.46.4 to ^0.46.5

### [3.0.4](https://www.github.com/libp2p/js-libp2p/compare/webtransport-v3.0.3...webtransport-v3.0.4) (2023-08-14)


### Bug Fixes

* **@libp2p/webtransport:** maximum call stack size exceeded on abort ([#1947](https://www.github.com/libp2p/js-libp2p/issues/1947)) ([5e85154](https://www.github.com/libp2p/js-libp2p/commit/5e85154b2953867e77e31a4fb823b20cb0620092))
* update project config ([9c0353c](https://www.github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.1 to ^0.1.2
    * @libp2p/logger bumped from ^3.0.1 to ^3.0.2
    * @libp2p/peer-id bumped from ^3.0.1 to ^3.0.2
  * devDependencies
    * libp2p bumped from ^0.46.3 to ^0.46.4

### [3.0.3](https://www.github.com/libp2p/js-libp2p/compare/webtransport-v3.0.2...webtransport-v3.0.3) (2023-08-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.0 to ^0.1.1
    * @libp2p/logger bumped from ^3.0.0 to ^3.0.1
    * @libp2p/peer-id bumped from ^3.0.0 to ^3.0.1
  * devDependencies
    * libp2p bumped from ^0.46.2 to ^0.46.3

### [3.0.2](https://www.github.com/libp2p/js-libp2p/compare/webtransport-v3.0.1...webtransport-v3.0.2) (2023-08-04)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * libp2p bumped from ^0.46.1 to ^0.46.2

### [3.0.1](https://www.github.com/libp2p/js-libp2p/compare/webtransport-v3.0.0...webtransport-v3.0.1) (2023-08-01)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * libp2p bumped from ^0.46.0 to ^0.46.1

## [3.0.0](https://www.github.com/libp2p/js-libp2p/compare/webtransport-v2.0.2...webtransport-v3.0.0) (2023-07-31)


### ⚠ BREAKING CHANGES

* the `.close`, `closeRead` and `closeWrite` methods on the `Stream` interface are now asynchronous
* `stream.stat.*` and `conn.stat.*` properties are now accessed via `stream.*` and `conn.*`
* consolidate interface modules (#1833)

### Features

* merge stat properties into stream/connection objects ([#1856](https://www.github.com/libp2p/js-libp2p/issues/1856)) ([e9cafd3](https://www.github.com/libp2p/js-libp2p/commit/e9cafd3d8ab0f8e0655ff44e04aa41fccc912b51)), closes [#1849](https://www.github.com/libp2p/js-libp2p/issues/1849)


### Bug Fixes

* close streams gracefully ([#1864](https://www.github.com/libp2p/js-libp2p/issues/1864)) ([b36ec7f](https://www.github.com/libp2p/js-libp2p/commit/b36ec7f24e477af21cec31effc086a6c611bf271)), closes [#1793](https://www.github.com/libp2p/js-libp2p/issues/1793) [#656](https://www.github.com/libp2p/js-libp2p/issues/656)
* consolidate interface modules ([#1833](https://www.github.com/libp2p/js-libp2p/issues/1833)) ([4255b1e](https://www.github.com/libp2p/js-libp2p/commit/4255b1e2485d31e00c33efa029b6426246ea23e3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ~0.0.1 to ^0.1.0
    * @libp2p/logger bumped from ^2.0.0 to ^3.0.0
    * @libp2p/peer-id bumped from ^2.0.0 to ^3.0.0
  * devDependencies
    * libp2p bumped from ^0.45.0 to ^0.46.0

## [2.0.1](https://github.com/libp2p/js-libp2p-webtransport/compare/v2.0.0...v2.0.1) (2023-04-28)


### Dependencies

* bump @libp2p/interface-transport from 2.1.3 to 4.0.1 ([#72](https://github.com/libp2p/js-libp2p-webtransport/issues/72)) ([04b977d](https://github.com/libp2p/js-libp2p-webtransport/commit/04b977db00bf0d71574f4618eaf0f070a5ce9441))

## [2.0.0](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.11...v2.0.0) (2023-04-28)


### ⚠ BREAKING CHANGES

* the type of the source/sink properties have changed

### Dependencies

* update stream types ([#66](https://github.com/libp2p/js-libp2p-webtransport/issues/66)) ([3772060](https://github.com/libp2p/js-libp2p-webtransport/commit/3772060df436f72976d9aaaa9d619ef5e7d93408))

## [1.0.11](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.10...v1.0.11) (2023-03-28)


### Bug Fixes

* allow dialling ip6 webtransport addresses ([#60](https://github.com/libp2p/js-libp2p-webtransport/issues/60)) ([fe4612a](https://github.com/libp2p/js-libp2p-webtransport/commit/fe4612a37620203a04b70ec96acce7c890f2ec7d))

## [1.0.10](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.9...v1.0.10) (2023-03-24)


### Bug Fixes

* window is not defined in worker contexts ([#59](https://github.com/libp2p/js-libp2p-webtransport/issues/59)) ([94c646b](https://github.com/libp2p/js-libp2p-webtransport/commit/94c646bdcdb9c1e5fa13d00a3ae03bc6c5727404))

## [1.0.9](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.8...v1.0.9) (2023-03-22)


### Dependencies

* update @multiformats/multiaddr to 12.x.x ([#58](https://github.com/libp2p/js-libp2p-webtransport/issues/58)) ([1b3d005](https://github.com/libp2p/js-libp2p-webtransport/commit/1b3d005e4d82a2fec3e9ab32bb813cae9e073af2))


### Documentation

* **example:** add helper instructions for running example ([#56](https://github.com/libp2p/js-libp2p-webtransport/issues/56)) ([0f0d54b](https://github.com/libp2p/js-libp2p-webtransport/commit/0f0d54b56a60ea80a91f96b05b74f2d42f443a15))

## [1.0.8](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.7...v1.0.8) (2023-03-22)


### Trivial Changes

* constrain go version examples run with ([#57](https://github.com/libp2p/js-libp2p-webtransport/issues/57)) ([aa177a8](https://github.com/libp2p/js-libp2p-webtransport/commit/aa177a8afcdb4fcccbd22cd97e8676fa00a44187))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([9435f0d](https://github.com/libp2p/js-libp2p-webtransport/commit/9435f0d1f9a93169e26789c6a3cb0706f06149cd))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([63f0c33](https://github.com/libp2p/js-libp2p-webtransport/commit/63f0c33bc2b876c11ec756e132bb679f32f46245))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([5e3a711](https://github.com/libp2p/js-libp2p-webtransport/commit/5e3a71197f1c8e89a9a5c05bdeee544bc3e460f1))


### Dependencies

* **dev:** bump aegir from 37.12.1 to 38.1.7 ([#54](https://github.com/libp2p/js-libp2p-webtransport/issues/54)) ([23bbd82](https://github.com/libp2p/js-libp2p-webtransport/commit/23bbd82bf2c3caa25d5964c98f7362736134862d))

## [1.0.7](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.6...v1.0.7) (2023-01-12)


### Dependencies

* Update deps and add quic-v1 support ([#44](https://github.com/libp2p/js-libp2p-webtransport/issues/44)) ([d1613b1](https://github.com/libp2p/js-libp2p-webtransport/commit/d1613b10c1c8164fadcbe9a28175b7f0099d1645)), closes [#35](https://github.com/libp2p/js-libp2p-webtransport/issues/35)


### Documentation

* update project config to publish api docs ([#45](https://github.com/libp2p/js-libp2p-webtransport/issues/45)) ([bdbf402](https://github.com/libp2p/js-libp2p-webtransport/commit/bdbf4025b5f80d6cc8af49596da09386538dc791))

## [1.0.6](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.5...v1.0.6) (2022-12-06)


### Bug Fixes

* Make a fix release with [#32](https://github.com/libp2p/js-libp2p-webtransport/issues/32) ([#34](https://github.com/libp2p/js-libp2p-webtransport/issues/34)) ([66a38f6](https://github.com/libp2p/js-libp2p-webtransport/commit/66a38f6e452e72042ad10ef8521544d8b5afecff))

## [1.0.5](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.4...v1.0.5) (2022-11-16)


### Bug Fixes

* Close stream after sink ([#23](https://github.com/libp2p/js-libp2p-webtransport/issues/23)) ([a95720c](https://github.com/libp2p/js-libp2p-webtransport/commit/a95720c367c8061ae45b4ae4bc4180e3ceea61cc))

## [1.0.4](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.3...v1.0.4) (2022-11-01)


### Documentation

* Use textarea for multiaddr input in example ([#24](https://github.com/libp2p/js-libp2p-webtransport/issues/24)) ([14ce351](https://github.com/libp2p/js-libp2p-webtransport/commit/14ce351375dabb31df948005b20acff56acc483a))

## [1.0.3](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.2...v1.0.3) (2022-10-18)


### Documentation

* add fetch-file-from-kubo example ([#12](https://github.com/libp2p/js-libp2p-webtransport/issues/12)) ([4a8f2f3](https://github.com/libp2p/js-libp2p-webtransport/commit/4a8f2f3eb4fdede1510aa2808d4c9a30d7ae86bf))

## [1.0.2](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.1...v1.0.2) (2022-10-17)


### Bug Fixes

* update project, remove @libp2p/components and unused deps ([#20](https://github.com/libp2p/js-libp2p-webtransport/issues/20)) ([568638e](https://github.com/libp2p/js-libp2p-webtransport/commit/568638e9fddc57726547e9147647af468a28bf51))

## [1.0.1](https://github.com/libp2p/js-libp2p-webtransport/compare/v1.0.0...v1.0.1) (2022-10-12)


### Dependencies

* bump multiformats from 9.9.0 to 10.0.0 ([c3f7d22](https://github.com/libp2p/js-libp2p-webtransport/commit/c3f7d220969de6ec8a632738f760ab11388ef3e7))
* **dev:** bump @libp2p/interface-transport-compliance-tests ([62c8e6b](https://github.com/libp2p/js-libp2p-webtransport/commit/62c8e6b3c18959d7416767d307a5ebaac8c19ae8))
* **dev:** bump protons from 5.1.0 to 6.0.0 ([03f7f33](https://github.com/libp2p/js-libp2p-webtransport/commit/03f7f33ba5561771746f1f1cfff7421da36c5889))

## 1.0.0 (2022-10-12)


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([cc208ac](https://github.com/libp2p/js-libp2p-webtransport/commit/cc208acc1c3459e5ec5f230927bfe5dc6e175f39))
* use rc version of libp2p ([bdc9dfb](https://github.com/libp2p/js-libp2p-webtransport/commit/bdc9dfb63f9853a38bc3b6999a1f986bff116dda))


### Dependencies

* bump protons-runtime from 3.1.0 to 4.0.1 ([a7ef395](https://github.com/libp2p/js-libp2p-webtransport/commit/a7ef3959d024813caa327afdd502d5bcb91a15e3))
* **dev:** bump @libp2p/interface-mocks from 4.0.3 to 7.0.1 ([85a492d](https://github.com/libp2p/js-libp2p-webtransport/commit/85a492da5b8df76d710dd21dd4b8bf59df4e1184))
* **dev:** bump uint8arrays from 3.1.1 to 4.0.2 ([cb554e8](https://github.com/libp2p/js-libp2p-webtransport/commit/cb554e8dbb19a6ec5b085307f4c04c04ae313d2d))