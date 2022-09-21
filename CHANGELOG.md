## [3.1.1](https://github.com/libp2p/js-libp2p-tcp/compare/v3.1.0...v3.1.1) (2022-09-21)


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([5096725](https://github.com/libp2p/js-libp2p-tcp/commit/5096725d84fc0197cf0e055bfd6954a125001b47))

## [3.1.0](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.8...v3.1.0) (2022-09-14)


### Features

* Unix domain sockets ([#208](https://github.com/libp2p/js-libp2p-tcp/issues/208)) ([223f79b](https://github.com/libp2p/js-libp2p-tcp/commit/223f79b53091c33d4588b3c5e5adf28bcb929d97)), closes [#132](https://github.com/libp2p/js-libp2p-tcp/issues/132)

## [3.0.8](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.7...v3.0.8) (2022-09-12)


### Trivial Changes

* fix readme example ([#207](https://github.com/libp2p/js-libp2p-tcp/issues/207)) ([9f7cf76](https://github.com/libp2p/js-libp2p-tcp/commit/9f7cf761af41c12ca0a23c7df9b305ae876439f8))

## [3.0.7](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.6...v3.0.7) (2022-09-12)


### Bug Fixes

* handle address being undefined ([#209](https://github.com/libp2p/js-libp2p-tcp/issues/209)) ([64ed009](https://github.com/libp2p/js-libp2p-tcp/commit/64ed0090ae9d6295496cd69e82b879627ea2069c))

## [3.0.6](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.5...v3.0.6) (2022-09-01)


### Bug Fixes

* add socket keepalive ([#205](https://github.com/libp2p/js-libp2p-tcp/issues/205)) ([9ac799b](https://github.com/libp2p/js-libp2p-tcp/commit/9ac799b0c057d209920997a30ca219ea96000131)), closes [/github.com/libp2p/go-libp2p/blob/master/p2p/transport/tcp/tcp.go#L85](https://github.com/libp2p//github.com/libp2p/go-libp2p/blob/master/p2p/transport/tcp/tcp.go/issues/L85) [/github.com/libp2p/go-libp2p/blob/master/p2p/transport/tcp/tcp.go#L191](https://github.com/libp2p//github.com/libp2p/go-libp2p/blob/master/p2p/transport/tcp/tcp.go/issues/L191)

## [3.0.5](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.4...v3.0.5) (2022-08-31)


### Bug Fixes

* destroy sockets on close ([#204](https://github.com/libp2p/js-libp2p-tcp/issues/204)) ([e8b8f2e](https://github.com/libp2p/js-libp2p-tcp/commit/e8b8f2eaf547640f2566b18a8d061912965f2a55)), closes [#201](https://github.com/libp2p/js-libp2p-tcp/issues/201)

## [3.0.4](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.3...v3.0.4) (2022-08-30)


### Bug Fixes

* add tests for ipv6 wildcard support ([#203](https://github.com/libp2p/js-libp2p-tcp/issues/203)) ([71c974d](https://github.com/libp2p/js-libp2p-tcp/commit/71c974deaf40a4ab2eabc7d3e404d865a6892b20)), closes [#100](https://github.com/libp2p/js-libp2p-tcp/issues/100)

## [3.0.3](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.2...v3.0.3) (2022-08-10)


### Bug Fixes

* update all deps ([#199](https://github.com/libp2p/js-libp2p-tcp/issues/199)) ([e3b1344](https://github.com/libp2p/js-libp2p-tcp/commit/e3b13441199ef84912d8ba14f7e42235313b12d6))

## [3.0.2](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.1...v3.0.2) (2022-07-13)


### Trivial Changes

* **deps-dev:** bump @libp2p/interface-mocks from 2.1.0 to 3.0.1 ([#193](https://github.com/libp2p/js-libp2p-tcp/issues/193)) ([0571339](https://github.com/libp2p/js-libp2p-tcp/commit/0571339387dad55739fa2d831d39d5165620ecbb))
* **deps:** bump @libp2p/utils from 2.0.1 to 3.0.0 ([#192](https://github.com/libp2p/js-libp2p-tcp/issues/192)) ([0c757ff](https://github.com/libp2p/js-libp2p-tcp/commit/0c757ff95b13bdf1ffb3285fa4b10d0988e8e42b))

## [3.0.1](https://github.com/libp2p/js-libp2p-tcp/compare/v3.0.0...v3.0.1) (2022-06-27)


### Bug Fixes

* add explicit return type to dial ([#191](https://github.com/libp2p/js-libp2p-tcp/issues/191)) ([cdb0932](https://github.com/libp2p/js-libp2p-tcp/commit/cdb09323188e77dee06a186ae43ba544faea5f86))

## [3.0.0](https://github.com/libp2p/js-libp2p-tcp/compare/v2.0.1...v3.0.0) (2022-06-17)


### ⚠ BREAKING CHANGES

* the registry API has changed

### Trivial Changes

* **deps:** bump @libp2p/utils from 1.0.10 to 2.0.0 ([#187](https://github.com/libp2p/js-libp2p-tcp/issues/187)) ([fa59390](https://github.com/libp2p/js-libp2p-tcp/commit/fa593907832f19b77f86e9ae45389fee3d6228f8))
* update deps ([#189](https://github.com/libp2p/js-libp2p-tcp/issues/189)) ([719f3f5](https://github.com/libp2p/js-libp2p-tcp/commit/719f3f55dc932afdf7d83c9d9a2cbf43146002a2))

## [2.0.1](https://github.com/libp2p/js-libp2p-tcp/compare/v2.0.0...v2.0.1) (2022-06-16)


### Trivial Changes

* **deps:** bump @libp2p/logger from 1.1.6 to 2.0.0 ([#186](https://github.com/libp2p/js-libp2p-tcp/issues/186)) ([5de2104](https://github.com/libp2p/js-libp2p-tcp/commit/5de2104f187e9f414b52fe2fee7580b78f2050af))

## [2.0.0](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.11...v2.0.0) (2022-06-15)


### ⚠ BREAKING CHANGES

* uses new single-issue libp2p interface modules

### Features

* update to latest interfaces ([#184](https://github.com/libp2p/js-libp2p-tcp/issues/184)) ([2924414](https://github.com/libp2p/js-libp2p-tcp/commit/2924414995356ce179da315fde8fda0958959e2d))

### [1.0.11](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.10...v1.0.11) (2022-05-23)


### Bug Fixes

* update interfaces ([#182](https://github.com/libp2p/js-libp2p-tcp/issues/182)) ([4ce3476](https://github.com/libp2p/js-libp2p-tcp/commit/4ce34767fe29355a5ff0c8069caa33b923ea9966))

### [1.0.10](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.9...v1.0.10) (2022-05-23)


### Trivial Changes

* **deps-dev:** bump sinon from 13.0.2 to 14.0.0 ([#179](https://github.com/libp2p/js-libp2p-tcp/issues/179)) ([ed4c6bd](https://github.com/libp2p/js-libp2p-tcp/commit/ed4c6bd4ed8b9b01e86cbb5de0206b77683f1b93))

### [1.0.9](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.8...v1.0.9) (2022-05-04)


### Bug Fixes

* update interfaces ([#178](https://github.com/libp2p/js-libp2p-tcp/issues/178)) ([2b1e875](https://github.com/libp2p/js-libp2p-tcp/commit/2b1e8751493aefd3b9149e660357f73377ab5d0b))

### [1.0.8](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.7...v1.0.8) (2022-04-07)


### Trivial Changes

* update aegir ([#177](https://github.com/libp2p/js-libp2p-tcp/issues/177)) ([f54d6b4](https://github.com/libp2p/js-libp2p-tcp/commit/f54d6b4f631f26b248231330b4b8f512996625b3))

### [1.0.7](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.6...v1.0.7) (2022-04-05)


### Trivial Changes

* update README to the latest changes ([#169](https://github.com/libp2p/js-libp2p-tcp/issues/169)) ([129bf19](https://github.com/libp2p/js-libp2p-tcp/commit/129bf1958be3c2001b1f84646b6a7ccba6e20b52))

### [1.0.6](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.5...v1.0.6) (2022-03-16)


### Bug Fixes

* update interfaces ([#172](https://github.com/libp2p/js-libp2p-tcp/issues/172)) ([d72f629](https://github.com/libp2p/js-libp2p-tcp/commit/d72f629f7f89853bd849fb9123a99a407140d977))

### [1.0.5](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.4...v1.0.5) (2022-02-21)


### Bug Fixes

* update to latest interfaces ([#170](https://github.com/libp2p/js-libp2p-tcp/issues/170)) ([d8840e8](https://github.com/libp2p/js-libp2p-tcp/commit/d8840e881d5025b5c704eeb461a7e78685e53a87))

### [1.0.4](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.3...v1.0.4) (2022-02-10)


### Bug Fixes

* update to latest interfaces ([#168](https://github.com/libp2p/js-libp2p-tcp/issues/168)) ([c19462f](https://github.com/libp2p/js-libp2p-tcp/commit/c19462fccd2f8f1038530a0b3aea834fc9aab04d))

### [1.0.3](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.2...v1.0.3) (2022-02-06)


### Bug Fixes

* publish from root dir ([#167](https://github.com/libp2p/js-libp2p-tcp/issues/167)) ([4be1369](https://github.com/libp2p/js-libp2p-tcp/commit/4be13699a40e0b825c464e27ae3a6e6743e45c0e))
* update to latest interfaces ([#164](https://github.com/libp2p/js-libp2p-tcp/issues/164)) ([7edad3c](https://github.com/libp2p/js-libp2p-tcp/commit/7edad3c4ae31d2bcc2ccebe2b5597da246c733c7))


### Trivial Changes

* update readme ([#166](https://github.com/libp2p/js-libp2p-tcp/issues/166)) ([2a0b609](https://github.com/libp2p/js-libp2p-tcp/commit/2a0b6098bb4739758e66f15a81ac42c922ea57b5))

### [1.0.2](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.1...v1.0.2) (2022-01-08)


### Trivial Changes

* add dependabot ([#154](https://github.com/libp2p/js-libp2p-tcp/issues/154)) ([02974b3](https://github.com/libp2p/js-libp2p-tcp/commit/02974b3e41a1618a9ffb8e4a03edecc1c7fcd1f5))

### [1.0.1](https://github.com/libp2p/js-libp2p-tcp/compare/v1.0.0...v1.0.1) (2022-01-08)


### Trivial Changes

* add semantic release config ([#155](https://github.com/libp2p/js-libp2p-tcp/issues/155)) ([def9ad7](https://github.com/libp2p/js-libp2p-tcp/commit/def9ad759d39da21639358b06bd847ab30b3cb7b))

## [0.17.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.17.1...v0.17.2) (2021-09-03)


### Bug Fixes

* ts declaration export ([#150](https://github.com/libp2p/js-libp2p-tcp/issues/150)) ([d165fe5](https://github.com/libp2p/js-libp2p-tcp/commit/d165fe57960e2bb4a5324c372ef459c31dee1cf5))



## [0.17.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.17.0...v0.17.1) (2021-07-08)



# [0.17.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.16.0...v0.17.0) (2021-07-07)


### chore

* update deps ([#147](https://github.com/libp2p/js-libp2p-tcp/issues/147)) ([b3e315a](https://github.com/libp2p/js-libp2p-tcp/commit/b3e315a6988cd4be7978e8922f275e525463bc0c))


### BREAKING CHANGES

* uses new majors of multiaddr and mafmt



# [0.16.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.15.4...v0.16.0) (2021-06-10)


### Features

* add types ([#145](https://github.com/libp2p/js-libp2p-tcp/issues/145)) ([3249e02](https://github.com/libp2p/js-libp2p-tcp/commit/3249e0292b2ef5d818fe428ce61f689b25060d85))



## [0.15.4](https://github.com/libp2p/js-libp2p-tcp/compare/v0.15.2...v0.15.4) (2021-04-12)


### Bug Fixes

* hanging close promise ([#140](https://github.com/libp2p/js-libp2p-tcp/issues/140)) ([3813100](https://github.com/libp2p/js-libp2p-tcp/commit/381310043852a9213f1abb62f5f0a7046d806286))



<a name="0.15.3"></a>
## [0.15.3](https://github.com/libp2p/js-libp2p-tcp/compare/v0.15.2...v0.15.3) (2021-02-03)


### Bug Fixes

* hanging close promise ([#140](https://github.com/libp2p/js-libp2p-tcp/issues/140)) ([3813100](https://github.com/libp2p/js-libp2p-tcp/commit/3813100))



<a name="0.15.2"></a>
## [0.15.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.2...v0.15.2) (2020-12-28)


### Bug Fixes

* catch error from maConn.close ([#128](https://github.com/libp2p/js-libp2p-tcp/issues/128)) ([0fe0815](https://github.com/libp2p/js-libp2p-tcp/commit/0fe0815))
* catch thrown maConn errors in listener ([#122](https://github.com/libp2p/js-libp2p-tcp/issues/122)) ([86db568](https://github.com/libp2p/js-libp2p-tcp/commit/86db568)), closes [#121](https://github.com/libp2p/js-libp2p-tcp/issues/121)
* intermittent error when asking for interfaces ([#137](https://github.com/libp2p/js-libp2p-tcp/issues/137)) ([af9804e](https://github.com/libp2p/js-libp2p-tcp/commit/af9804e))
* remove use of assert module ([#123](https://github.com/libp2p/js-libp2p-tcp/issues/123)) ([6272876](https://github.com/libp2p/js-libp2p-tcp/commit/6272876))
* transport should not handle connection if upgradeInbound throws ([#119](https://github.com/libp2p/js-libp2p-tcp/issues/119)) ([21f8747](https://github.com/libp2p/js-libp2p-tcp/commit/21f8747))


### Chores

* update deps ([#134](https://github.com/libp2p/js-libp2p-tcp/issues/134)) ([d9f9912](https://github.com/libp2p/js-libp2p-tcp/commit/d9f9912))


### BREAKING CHANGES

* - The multiaddr dep used by this module returns Uint8Arrays and may
  not be compatible with previous versions

* chore: update utils

* chore: remove gh dep url



<a name="0.15.1"></a>
## [0.15.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.15.0...v0.15.1) (2020-08-11)



<a name="0.15.0"></a>
# [0.15.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.6...v0.15.0) (2020-08-07)


### Chores

* update deps ([#134](https://github.com/libp2p/js-libp2p-tcp/issues/134)) ([d9f9912](https://github.com/libp2p/js-libp2p-tcp/commit/d9f9912))


### BREAKING CHANGES

* - The multiaddr dep used by this module returns Uint8Arrays and may
  not be compatible with previous versions

* chore: update utils

* chore: remove gh dep url



<a name="0.14.6"></a>
## [0.14.6](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.5...v0.14.6) (2020-07-17)



<a name="0.14.5"></a>
## [0.14.5](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.4...v0.14.5) (2020-04-28)


### Bug Fixes

* catch error from maConn.close ([#128](https://github.com/libp2p/js-libp2p-tcp/issues/128)) ([0fe0815](https://github.com/libp2p/js-libp2p-tcp/commit/0fe0815))



<a name="0.14.4"></a>
## [0.14.4](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.3...v0.14.4) (2020-02-24)


### Bug Fixes

* catch thrown maConn errors in listener ([#122](https://github.com/libp2p/js-libp2p-tcp/issues/122)) ([86db568](https://github.com/libp2p/js-libp2p-tcp/commit/86db568)), closes [#121](https://github.com/libp2p/js-libp2p-tcp/issues/121)
* remove use of assert module ([#123](https://github.com/libp2p/js-libp2p-tcp/issues/123)) ([6272876](https://github.com/libp2p/js-libp2p-tcp/commit/6272876))



<a name="0.14.3"></a>
## [0.14.3](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.2...v0.14.3) (2019-12-20)


### Bug Fixes

* transport should not handle connection if upgradeInbound throws ([#119](https://github.com/libp2p/js-libp2p-tcp/issues/119)) ([21f8747](https://github.com/libp2p/js-libp2p-tcp/commit/21f8747))



<a name="0.14.2"></a>
## [0.14.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.1...v0.14.2) (2019-12-06)


### Bug Fixes

* **log:** log the bound port and host ([#117](https://github.com/libp2p/js-libp2p-tcp/issues/117)) ([7702646](https://github.com/libp2p/js-libp2p-tcp/commit/7702646))


### Features

* add path multiaddr support ([#118](https://github.com/libp2p/js-libp2p-tcp/issues/118)) ([d76a1f2](https://github.com/libp2p/js-libp2p-tcp/commit/d76a1f2))



<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.14.0...v0.14.1) (2019-09-20)


### Bug Fixes

* ensure timeline.close is set ([#113](https://github.com/libp2p/js-libp2p-tcp/issues/113)) ([605ee27](https://github.com/libp2p/js-libp2p-tcp/commit/605ee27))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.13.1...v0.14.0) (2019-09-16)


### Features

* change api to async / await ([#112](https://github.com/libp2p/js-libp2p-tcp/issues/112)) ([cf7d1b8](https://github.com/libp2p/js-libp2p-tcp/commit/cf7d1b8))


### BREAKING CHANGES

* All places in the API that used callbacks are now replaced with async/await. The API has also been updated according to the latest `interface-transport` version, https://github.com/libp2p/interface-transport/tree/v0.6.0#api.



<a name="0.13.1"></a>
## [0.13.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.13.0...v0.13.1) (2019-08-08)



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.12.1...v0.13.0) (2018-09-12)


### Features

* add support for dialing over dns ([eba0b48](https://github.com/libp2p/js-libp2p-tcp/commit/eba0b48))



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.12.0...v0.12.1) (2018-07-31)


### Bug Fixes

* invalid ip address and daemon can be crashed by remote user ([4b04b17](https://github.com/libp2p/js-libp2p-tcp/commit/4b04b17))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.11.6...v0.12.0) (2018-04-05)


### Features

* add class-is module ([ded1f68](https://github.com/libp2p/js-libp2p-tcp/commit/ded1f68))



<a name="0.11.6"></a>
## [0.11.6](https://github.com/libp2p/js-libp2p-tcp/compare/v0.11.5...v0.11.6) (2018-02-20)



<a name="0.11.5"></a>
## [0.11.5](https://github.com/libp2p/js-libp2p-tcp/compare/v0.11.4...v0.11.5) (2018-02-07)



<a name="0.11.4"></a>
## [0.11.4](https://github.com/libp2p/js-libp2p-tcp/compare/v0.11.3...v0.11.4) (2018-02-07)



<a name="0.11.3"></a>
## [0.11.3](https://github.com/libp2p/js-libp2p-tcp/compare/v0.11.2...v0.11.3) (2018-02-07)


### Bug Fixes

* clearing timeout when closes ([#87](https://github.com/libp2p/js-libp2p-tcp/issues/87)) ([f8f5266](https://github.com/libp2p/js-libp2p-tcp/commit/f8f5266))



<a name="0.11.2"></a>
## [0.11.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.11.1...v0.11.2) (2018-01-12)


### Bug Fixes

* missing dependency debug, fixes [#84](https://github.com/libp2p/js-libp2p-tcp/issues/84) ([74a88f6](https://github.com/libp2p/js-libp2p-tcp/commit/74a88f6))



<a name="0.11.1"></a>
## [0.11.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.11.0...v0.11.1) (2017-10-13)


### Features

* relay filtering  ([11c4f45](https://github.com/libp2p/js-libp2p-tcp/commit/11c4f45))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.10.2...v0.11.0) (2017-09-03)


### Features

* p2p addrs situation ([#82](https://github.com/libp2p/js-libp2p-tcp/issues/82)) ([a54bb83](https://github.com/libp2p/js-libp2p-tcp/commit/a54bb83))



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.10.1...v0.10.2) (2017-07-22)



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.10.0...v0.10.1) (2017-04-13)


### Bug Fixes

* catch errors on incomming sockets ([e204517](https://github.com/libp2p/js-libp2p-tcp/commit/e204517))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.9.4...v0.10.0) (2017-03-27)


### Bug Fixes

* **dial:** proper error handling on dial ([#77](https://github.com/libp2p/js-libp2p-tcp/issues/77)) ([4d4f295](https://github.com/libp2p/js-libp2p-tcp/commit/4d4f295))



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-tcp/compare/v0.9.3...v0.9.4) (2017-03-21)



<a name="0.9.3"></a>
## [0.9.3](https://github.com/libp2p/js-libp2p-tcp/compare/v0.9.2...v0.9.3) (2017-02-09)



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.9.1...v0.9.2) (2017-02-09)



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.9.0...v0.9.1) (2016-11-03)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.8.1...v0.9.0) (2016-11-03)


### Bug Fixes

* **deps:** remove unused pull dep ([06689e3](https://github.com/libp2p/js-libp2p-tcp/commit/06689e3))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.8.0...v0.8.1) (2016-09-06)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.7.4...v0.8.0) (2016-09-06)


### Features

* **deps:** update to published deps ([da8ee21](https://github.com/libp2p/js-libp2p-tcp/commit/da8ee21))
* **pull:** migration to pull-streams ([5e89a26](https://github.com/libp2p/js-libp2p-tcp/commit/5e89a26))
* **readme:** add pull-streams documentation ([d9f65e0](https://github.com/libp2p/js-libp2p-tcp/commit/d9f65e0))



<a name="0.7.4"></a>
## [0.7.4](https://github.com/libp2p/js-libp2p-tcp/compare/v0.7.3...v0.7.4) (2016-08-03)



<a name="0.7.3"></a>
## [0.7.3](https://github.com/libp2p/js-libp2p-tcp/compare/v0.7.2...v0.7.3) (2016-06-26)



<a name="0.7.2"></a>
## [0.7.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.7.1...v0.7.2) (2016-06-23)



<a name="0.7.1"></a>
## [0.7.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.7.0...v0.7.1) (2016-06-23)


### Bug Fixes

* error was passed in duplicate ([9ac5cca](https://github.com/libp2p/js-libp2p-tcp/commit/9ac5cca))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.6.2...v0.7.0) (2016-06-22)



<a name="0.6.2"></a>
## [0.6.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.6.1...v0.6.2) (2016-06-01)


### Bug Fixes

* address cr ([2ed01e8](https://github.com/libp2p/js-libp2p-tcp/commit/2ed01e8))
* destroy hanging connections after timeout ([4a12169](https://github.com/libp2p/js-libp2p-tcp/commit/4a12169))



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.6.0...v0.6.1) (2016-05-29)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.5.3...v0.6.0) (2016-05-22)



<a name="0.5.3"></a>
## [0.5.3](https://github.com/libp2p/js-libp2p-tcp/compare/v0.5.2...v0.5.3) (2016-05-22)



<a name="0.5.2"></a>
## [0.5.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.5.1...v0.5.2) (2016-05-09)



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.5.0...v0.5.1) (2016-05-08)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.4.0...v0.5.0) (2016-04-25)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.3.0...v0.4.0) (2016-03-14)



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.2.1...v0.3.0) (2016-03-10)



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.2.0...v0.2.1) (2016-03-04)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-tcp/compare/v0.1.2...v0.2.0) (2016-03-04)



<a name="0.1.2"></a>
## [0.1.2](https://github.com/libp2p/js-libp2p-tcp/compare/v0.1.1...v0.1.2) (2015-10-29)



<a name="0.1.1"></a>
## [0.1.1](https://github.com/libp2p/js-libp2p-tcp/compare/v0.1.0...v0.1.1) (2015-09-17)



<a name="0.1.0"></a>
# 0.1.0 (2015-09-16)
