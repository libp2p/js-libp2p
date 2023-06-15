## [@libp2p/interface-metrics-v4.0.8](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.7...@libp2p/interface-metrics-v4.0.8) (2023-05-04)


### Dependencies

* bump aegir from 38.1.8 to 39.0.5 ([#393](https://github.com/libp2p/js-libp2p-interfaces/issues/393)) ([31f3797](https://github.com/libp2p/js-libp2p-interfaces/commit/31f3797b24f7c23f3f16e9db3a230bd5f7cd5175))

## [@libp2p/interface-metrics-v4.0.7](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.6...@libp2p/interface-metrics-v4.0.7) (2023-04-18)


### Dependencies

* update sibling dependencies ([2f52a28](https://github.com/libp2p/js-libp2p-interfaces/commit/2f52a284b59c0a88b040f86da1f5d3f044727f2c))

## [@libp2p/interface-metrics-v4.0.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.5...@libp2p/interface-metrics-v4.0.6) (2023-04-11)


### Dependencies

* update sibling dependencies ([b034810](https://github.com/libp2p/js-libp2p-interfaces/commit/b0348102e41dc18166e70063f4708a2b3544f4b6))

## [@libp2p/interface-metrics-v4.0.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.4...@libp2p/interface-metrics-v4.0.5) (2023-01-18)


### Trivial Changes

* remove lerna ([#330](https://github.com/libp2p/js-libp2p-interfaces/issues/330)) ([6678592](https://github.com/libp2p/js-libp2p-interfaces/commit/6678592dd0cf601a2671852f9d2a0aff5dee2b18))


### Dependencies

* bump aegir from 37.12.1 to 38.1.0 ([#335](https://github.com/libp2p/js-libp2p-interfaces/issues/335)) ([7368a36](https://github.com/libp2p/js-libp2p-interfaces/commit/7368a363423a08e8fa247dcb76ea13e4cf030d65))

## [@libp2p/interface-metrics-v4.0.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.3...@libp2p/interface-metrics-v4.0.4) (2022-12-16)


### Documentation

* update project config ([#323](https://github.com/libp2p/js-libp2p-interfaces/issues/323)) ([0fc6a08](https://github.com/libp2p/js-libp2p-interfaces/commit/0fc6a08e9cdcefe361fe325281a3a2a03759ff59))

## [@libp2p/interface-metrics-v4.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.2...@libp2p/interface-metrics-v4.0.3) (2022-12-14)


### Bug Fixes

* generate docs for all packages ([#321](https://github.com/libp2p/js-libp2p-interfaces/issues/321)) ([b6f8b32](https://github.com/libp2p/js-libp2p-interfaces/commit/b6f8b32a920c15a28fe021e6050e31aaae89d518))

## [@libp2p/interface-metrics-v4.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.1...@libp2p/interface-metrics-v4.0.2) (2022-11-05)


### Bug Fixes

* metrics only need numbers ([#312](https://github.com/libp2p/js-libp2p-interfaces/issues/312)) ([0076c1f](https://github.com/libp2p/js-libp2p-interfaces/commit/0076c1f354ebc1106b6ac42d48688c0209866084))

## [@libp2p/interface-metrics-v4.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.0...@libp2p/interface-metrics-v4.0.1) (2022-11-05)


### Bug Fixes

* update project config ([#311](https://github.com/libp2p/js-libp2p-interfaces/issues/311)) ([27dd0ce](https://github.com/libp2p/js-libp2p-interfaces/commit/27dd0ce3c249892ac69cbb24ddaf0b9f32385e37))

## [@libp2p/interface-metrics-v4.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v3.0.0...@libp2p/interface-metrics-v4.0.0) (2022-11-05)


### ⚠ BREAKING CHANGES

* the global/per-peer moving average tracking has been removed from the interface as it's expensive and requires lots of timers - this functionality can be replicated by implementations if it's desirable.  It's better to have simple counters instead and let an external system like Prometheus or Graphana calculate the values over time

### Features

* return metrics objects from register instead of updating with an options object ([#310](https://github.com/libp2p/js-libp2p-interfaces/issues/310)) ([3b106ce](https://github.com/libp2p/js-libp2p-interfaces/commit/3b106ce799b5d84a82a66238995e09970ed8116c))

## [@libp2p/interface-metrics-v3.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v2.0.0...@libp2p/interface-metrics-v3.0.0) (2022-08-07)


### ⚠ BREAKING CHANGES

* change stream muxer interface (#279)

### Features

* change stream muxer interface ([#279](https://github.com/libp2p/js-libp2p-interfaces/issues/279)) ([1ebe269](https://github.com/libp2p/js-libp2p-interfaces/commit/1ebe26988b6a286f36a4fc5177f502cfb60368a1))


### Trivial Changes

* update project config ([#271](https://github.com/libp2p/js-libp2p-interfaces/issues/271)) ([59c0bf5](https://github.com/libp2p/js-libp2p-interfaces/commit/59c0bf5e0b05496fca2e4902632b61bb41fad9e9))

## [@libp2p/interface-metrics-v2.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.3...@libp2p/interface-metrics-v2.0.0) (2022-07-01)


### ⚠ BREAKING CHANGES

* the return type of `metrics.getComponentMetrics` has been changed to include optional labels/help text and also is now a function that returns a single or group value

### Features

* add metrics groups ([#267](https://github.com/libp2p/js-libp2p-interfaces/issues/267)) ([b9d898a](https://github.com/libp2p/js-libp2p-interfaces/commit/b9d898abdb551ebe2e0e961ec325d5e6abcf4fab)), closes [#257](https://github.com/libp2p/js-libp2p-interfaces/issues/257) [#258](https://github.com/libp2p/js-libp2p-interfaces/issues/258)

## [@libp2p/interface-metrics-v1.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.2...@libp2p/interface-metrics-v1.0.3) (2022-06-27)


### Trivial Changes

* update deps ([#262](https://github.com/libp2p/js-libp2p-interfaces/issues/262)) ([51edf7d](https://github.com/libp2p/js-libp2p-interfaces/commit/51edf7d9b3765a6f75c915b1483ea345d0133a41))

## [@libp2p/interface-metrics-v1.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.1...@libp2p/interface-metrics-v1.0.2) (2022-06-14)


### Trivial Changes

* update aegir ([#234](https://github.com/libp2p/js-libp2p-interfaces/issues/234)) ([3e03895](https://github.com/libp2p/js-libp2p-interfaces/commit/3e038959ecab6cfa3585df9ee179c0af7a61eda5))

## [@libp2p/interface-metrics-v1.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.0...@libp2p/interface-metrics-v1.0.1) (2022-06-14)


### Trivial Changes

* update readmes ([#233](https://github.com/libp2p/js-libp2p-interfaces/issues/233)) ([ee7da38](https://github.com/libp2p/js-libp2p-interfaces/commit/ee7da38dccc08160d26c8436df8739ce7e0b340e))

## @libp2p/interface-metrics-v1.0.0 (2022-06-14)


### ⚠ BREAKING CHANGES

* most modules have been split out of the `@libp2p/interfaces` and `@libp2p/interface-compliance-tests` packages

### Trivial Changes

* break modules apart ([#232](https://github.com/libp2p/js-libp2p-interfaces/issues/232)) ([385614e](https://github.com/libp2p/js-libp2p-interfaces/commit/385614e772329052ab17415c8bd421f65b01a61b)), closes [#226](https://github.com/libp2p/js-libp2p-interfaces/issues/226)
