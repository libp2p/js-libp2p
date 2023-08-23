## [1.1.5](https://github.com/libp2p/js-libp2p-prometheus-metrics/compare/v1.1.4...v1.1.5) (2023-05-23)


### Bug Fixes

* move prom-client to deps ([#32](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/32)) ([73acad0](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/73acad0a20a9a0ad024cd47a53f154668dbae77b))

### [2.0.4](https://www.github.com/libp2p/js-libp2p/compare/prometheus-metrics-v2.0.3...prometheus-metrics-v2.0.4) (2023-08-16)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.3 to ^4.0.4

### [2.0.3](https://www.github.com/libp2p/js-libp2p/compare/prometheus-metrics-v2.0.2...prometheus-metrics-v2.0.3) (2023-08-14)


### Bug Fixes

* update project config ([9c0353c](https://www.github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.1 to ^0.1.2
    * @libp2p/logger bumped from ^3.0.1 to ^3.0.2
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.2 to ^4.0.3
    * @libp2p/peer-id-factory bumped from ^3.0.2 to ^3.0.3

### [2.0.2](https://www.github.com/libp2p/js-libp2p/compare/prometheus-metrics-v2.0.1...prometheus-metrics-v2.0.2) (2023-08-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.0 to ^0.1.1
    * @libp2p/logger bumped from ^3.0.0 to ^3.0.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.1 to ^4.0.2
    * @libp2p/peer-id-factory bumped from ^3.0.1 to ^3.0.2

### [2.0.1](https://www.github.com/libp2p/js-libp2p/compare/prometheus-metrics-v2.0.0...prometheus-metrics-v2.0.1) (2023-08-04)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.0 to ^4.0.1
    * @libp2p/peer-id-factory bumped from ^3.0.0 to ^3.0.1

## [2.0.0](https://www.github.com/libp2p/js-libp2p/compare/prometheus-metrics-v1.1.5...prometheus-metrics-v2.0.0) (2023-07-31)


### ⚠ BREAKING CHANGES

* `stream.stat.*` and `conn.stat.*` properties are now accessed via `stream.*` and `conn.*`
* consolidate interface modules (#1833)

### Features

* merge stat properties into stream/connection objects ([#1856](https://www.github.com/libp2p/js-libp2p/issues/1856)) ([e9cafd3](https://www.github.com/libp2p/js-libp2p/commit/e9cafd3d8ab0f8e0655ff44e04aa41fccc912b51)), closes [#1849](https://www.github.com/libp2p/js-libp2p/issues/1849)


### Bug Fixes

* consolidate interface modules ([#1833](https://www.github.com/libp2p/js-libp2p/issues/1833)) ([4255b1e](https://www.github.com/libp2p/js-libp2p/commit/4255b1e2485d31e00c33efa029b6426246ea23e3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ~0.0.1 to ^0.1.0
    * @libp2p/logger bumped from ^2.0.0 to ^3.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^3.0.0 to ^4.0.0
    * @libp2p/peer-id-factory bumped from ^2.0.0 to ^3.0.0

## [1.1.4](https://github.com/libp2p/js-libp2p-prometheus-metrics/compare/v1.1.3...v1.1.4) (2023-05-12)


### Trivial Changes

* Update .github/workflows/semantic-pull-request.yml [skip ci] ([7756331](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/77563319cdb0edcc75be7cd4ad7758054595991b))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([1a3861f](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/1a3861fd7c76a8fa296ff3aad39de633aecf3570))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([b66c4a0](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/b66c4a08983c1bbb2d1285aa2ea749ae00088643))


### Documentation

* added examples for package documentation for methods ([#31](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/31)) ([7dbd895](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/7dbd895dbf75f98b5730ad750b3e1aa9bc676c77)), closes [#30](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/30)

## [1.1.3](https://github.com/libp2p/js-libp2p-prometheus-metrics/compare/v1.1.2...v1.1.3) (2022-12-16)


### Documentation

* publish api docs ([#14](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/14)) ([78e708f](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/78e708f4a4b5040988da90ecfb636a1e59a96ee4))

## [1.1.2](https://github.com/libp2p/js-libp2p-prometheus-metrics/compare/v1.1.1...v1.1.2) (2022-11-22)


### Bug Fixes

* use collectDefaultMetrics option ([#7](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/7)) ([3e4f00c](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/3e4f00c539da19bdfd8a26d335f00a2457545b53))

## [1.1.1](https://github.com/libp2p/js-libp2p-prometheus-metrics/compare/v1.1.0...v1.1.1) (2022-11-21)


### Bug Fixes

* allow multiple consumers of metrics ([#6](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/6)) ([92bde9b](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/92bde9b8d9a533c4e8aca6a98c02fa1bdc37156e))

## [1.1.0](https://github.com/libp2p/js-libp2p-prometheus-metrics/compare/v1.0.1...v1.1.0) (2022-11-21)


### Features

* register metrics with custom registry ([#4](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/4)) ([5da2897](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/5da289702186b73862cce39ecd1752792e6f9751))


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([351b00c](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/351b00cad878cd3269a18da3f725613f991a83ae))

## [1.0.1](https://github.com/libp2p/js-libp2p-prometheus-metrics/compare/v1.0.0...v1.0.1) (2022-11-05)


### Bug Fixes

* pass numbers to prom-client ([#1](https://github.com/libp2p/js-libp2p-prometheus-metrics/issues/1)) ([7c38140](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/7c38140d97dc4cbfb5d21e63a214df133eae9d73))

## 1.0.0 (2022-11-05)


### Bug Fixes

* add tests for counters ([627b5c5](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/627b5c5886380433ef30efc80e8d32700f478f0b))
* update release config ([ee1542d](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/ee1542d18863b3d9d12cdb2a8ebb21241c61d993))


### Trivial Changes

* add components ([92fccf7](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/92fccf71ef23ccf9ca819ccc050ce12ae088ed76))
* fix tests ([f3f72f6](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/f3f72f6229969a6e947408cd3ba67a6b20607394))
* initial implementation ([b3a4d8b](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/b3a4d8b721b0974ce42a889d4d1029fe288553fe))
* linting ([9758456](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/9758456c2cf6dee949967609dc88655a671d0b25))
* linting ([0f84e4f](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/0f84e4f796801b87def8d4718e1e150a2af29065))
* simplified metrics ([12e6077](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/12e6077318155bc844a0d100f1c00d1bf7789111))
* stricter name/label parsing and tests ([0cf651d](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/0cf651de02102f406a45411ceb044a3a116a7436))
* update comments ([10b8c98](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/10b8c98718ff3579b1a2b236ed294c319bdc4ac4))
* update readme ([4176169](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/41761694d442f561a425c7bf6963e49627e8204e))


### Documentation

* update readme to link to correct branch ([1a7565b](https://github.com/libp2p/js-libp2p-prometheus-metrics/commit/1a7565b5986ba689eb7a6d555b15ca1a4e4d3f31))
