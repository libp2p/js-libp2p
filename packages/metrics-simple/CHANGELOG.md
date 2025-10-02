## [1.0.1](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.0.0...simple-metrics-v1.0.1) (2023-09-26)


### Bug Fixes

* track stream metrics ([#2](https://github.com/libp2p/js-libp2p-simple-metrics/issues/2)) ([caafb3d](https://github.com/libp2p/js-libp2p-simple-metrics/commit/caafb3d103fd7df0a2a4e6b3e800f4bc9c35c58f))

## [2.0.4](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v2.0.3...simple-metrics-v2.0.4) (2025-10-02)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.1 to ^3.0.2
    * @libp2p/logger bumped from ^6.0.3 to ^6.0.4

## [2.0.3](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v2.0.2...simple-metrics-v2.0.3) (2025-10-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.0 to ^3.0.1
    * @libp2p/logger bumped from ^6.0.2 to ^6.0.3

## [2.0.2](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v2.0.1...simple-metrics-v2.0.2) (2025-09-27)


### Bug Fixes

* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/logger bumped from ^6.0.1 to ^6.0.2

## [2.0.1](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v2.0.0...simple-metrics-v2.0.1) (2025-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/logger bumped from ^6.0.0 to ^6.0.1

## [2.0.0](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.16...simple-metrics-v2.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/logger bumped from ^5.2.0 to ^6.0.0

## [1.3.16](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.15...simple-metrics-v1.3.16) (2025-08-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.5 to ^2.11.0
    * @libp2p/logger bumped from ^5.1.21 to ^5.2.0

## [1.3.15](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.14...simple-metrics-v1.3.15) (2025-06-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.4 to ^2.10.5
    * @libp2p/logger bumped from ^5.1.20 to ^5.1.21

## [1.3.14](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.13...simple-metrics-v1.3.14) (2025-06-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.3 to ^2.10.4
    * @libp2p/logger bumped from ^5.1.19 to ^5.1.20

## [1.3.13](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.12...simple-metrics-v1.3.13) (2025-06-03)


### Bug Fixes

* clear references to metrics on stop ([#3154](https://github.com/libp2p/js-libp2p/issues/3154)) ([01328a0](https://github.com/libp2p/js-libp2p/commit/01328a0b4eab0a66d5805d9ad4b6f25dbbdb4b03))
* metrics should persist beyond node restarts ([#3159](https://github.com/libp2p/js-libp2p/issues/3159)) ([d91ae66](https://github.com/libp2p/js-libp2p/commit/d91ae66c6c8db5ae0a9cb9d388d67418fe318736))


### Documentation

* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.2 to ^2.10.3
    * @libp2p/logger bumped from ^5.1.18 to ^5.1.19

## [1.3.12](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.11...simple-metrics-v1.3.12) (2025-05-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.1 to ^2.10.2
    * @libp2p/logger bumped from ^5.1.17 to ^5.1.18

## [1.3.11](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.10...simple-metrics-v1.3.11) (2025-05-20)


### Dependencies

* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.0 to ^2.10.1
    * @libp2p/logger bumped from ^5.1.16 to ^5.1.17

## [1.3.10](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.9...simple-metrics-v1.3.10) (2025-05-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.9.0 to ^2.10.0
    * @libp2p/logger bumped from ^5.1.15 to ^5.1.16

## [1.3.9](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.8...simple-metrics-v1.3.9) (2025-04-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.8.0 to ^2.9.0
    * @libp2p/logger bumped from ^5.1.14 to ^5.1.15

## [1.3.8](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.7...simple-metrics-v1.3.8) (2025-04-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.7.0 to ^2.8.0
    * @libp2p/logger bumped from ^5.1.13 to ^5.1.14

## [1.3.7](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.6...simple-metrics-v1.3.7) (2025-03-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/logger bumped from ^5.1.12 to ^5.1.13

## [1.3.6](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.5...simple-metrics-v1.3.6) (2025-03-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.6.1 to ^2.7.0
    * @libp2p/logger bumped from ^5.1.11 to ^5.1.12

## [1.3.5](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.4...simple-metrics-v1.3.5) (2025-03-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/logger bumped from ^5.1.10 to ^5.1.11

## [1.3.4](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.3...simple-metrics-v1.3.4) (2025-02-25)


### Documentation

* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.6.0 to ^2.6.1
    * @libp2p/logger bumped from ^5.1.9 to ^5.1.10

## [1.3.3](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.2...simple-metrics-v1.3.3) (2025-02-20)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.5.0 to ^2.6.0
    * @libp2p/logger bumped from ^5.1.8 to ^5.1.9

## [1.3.2](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.1...simple-metrics-v1.3.2) (2025-02-10)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.4.1 to ^2.5.0
    * @libp2p/logger bumped from ^5.1.7 to ^5.1.8

## [1.3.1](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.3.0...simple-metrics-v1.3.1) (2025-02-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.4.0 to ^2.4.1
    * @libp2p/logger bumped from ^5.1.6 to ^5.1.7

## [1.3.0](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.8...simple-metrics-v1.3.0) (2025-01-07)


### Features

* add traceFunction call to metrics ([#2898](https://github.com/libp2p/js-libp2p/issues/2898)) ([20d9ba7](https://github.com/libp2p/js-libp2p/commit/20d9ba73e2fc76e42327458b2a1e29d1ba162bba))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.3.0 to ^2.4.0
    * @libp2p/logger bumped from ^5.1.5 to ^5.1.6

## [1.2.8](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.7...simple-metrics-v1.2.8) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.2.1 to ^2.3.0
    * @libp2p/logger bumped from ^5.1.4 to ^5.1.5

## [1.2.7](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.6...simple-metrics-v1.2.7) (2024-11-18)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.2.0 to ^2.2.1
    * @libp2p/logger bumped from ^5.1.3 to ^5.1.4

## [1.2.6](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.5...simple-metrics-v1.2.6) (2024-10-28)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.1.3 to ^2.2.0
    * @libp2p/logger bumped from ^5.1.2 to ^5.1.3

## [1.2.5](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.4...simple-metrics-v1.2.5) (2024-10-23)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/logger bumped from ^5.1.1 to ^5.1.2

## [1.2.4](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.3...simple-metrics-v1.2.4) (2024-10-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.1.2 to ^2.1.3
    * @libp2p/logger bumped from ^5.1.0 to ^5.1.1

## [1.2.3](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.2...simple-metrics-v1.2.3) (2024-09-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/logger bumped from ^5.0.4 to ^5.1.0

## [1.2.2](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.1...simple-metrics-v1.2.2) (2024-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.1.1 to ^2.1.2
    * @libp2p/logger bumped from ^5.0.3 to ^5.0.4

## [1.2.1](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.2.0...simple-metrics-v1.2.1) (2024-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.1.0 to ^2.1.1
    * @libp2p/logger bumped from ^5.0.2 to ^5.0.3

## [1.2.0](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.7...simple-metrics-v1.2.0) (2024-09-23)


### Features

* add histogram and summary metric types ([#2705](https://github.com/libp2p/js-libp2p/issues/2705)) ([21fe841](https://github.com/libp2p/js-libp2p/commit/21fe841f2584e0166253d78fc390401d7cee5601))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.0.1 to ^2.1.0
    * @libp2p/logger bumped from ^5.0.1 to ^5.0.2

## [1.1.7](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.6...simple-metrics-v1.1.7) (2024-09-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.0.0 to ^2.0.1
    * @libp2p/logger bumped from ^5.0.0 to ^5.0.1

## [1.1.6](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.5...simple-metrics-v1.1.6) (2024-09-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.7.0 to ^2.0.0
    * @libp2p/logger bumped from ^4.0.20 to ^5.0.0

## [1.1.5](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.4...simple-metrics-v1.1.5) (2024-08-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.6.3 to ^1.7.0
    * @libp2p/logger bumped from ^4.0.19 to ^4.0.20

## [1.1.4](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.3...simple-metrics-v1.1.4) (2024-08-02)


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.6.2 to ^1.6.3
    * @libp2p/logger bumped from ^4.0.18 to ^4.0.19

## [1.1.3](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.2...simple-metrics-v1.1.3) (2024-07-29)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.6.1 to ^1.6.2
    * @libp2p/logger bumped from ^4.0.17 to ^4.0.18

## [1.1.2](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.1...simple-metrics-v1.1.2) (2024-07-13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.6.0 to ^1.6.1
    * @libp2p/logger bumped from ^4.0.16 to ^4.0.17

## [1.1.1](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.1.0...simple-metrics-v1.1.1) (2024-07-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.5.0 to ^1.6.0
    * @libp2p/logger bumped from ^4.0.15 to ^4.0.16

## [1.1.0](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.0.3...simple-metrics-v1.1.0) (2024-06-18)


### Features

* check service dependencies on startup ([#2586](https://github.com/libp2p/js-libp2p/issues/2586)) ([d1f1c2b](https://github.com/libp2p/js-libp2p/commit/d1f1c2be78bd195f404e62627c2c9f545845e5f5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.4.1 to ^1.5.0
    * @libp2p/logger bumped from ^4.0.14 to ^4.0.15

## [1.0.3](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.0.2...simple-metrics-v1.0.3) (2024-06-07)


### Dependencies

* bump aegir from 42.2.11 to 43.0.1 ([#2571](https://github.com/libp2p/js-libp2p/issues/2571)) ([757fb26](https://github.com/libp2p/js-libp2p/commit/757fb2674f0a3e06fd46d3ff63f7f461c32d47d2))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.4.0 to ^1.4.1
    * @libp2p/logger bumped from ^4.0.13 to ^4.0.14

## [1.0.2](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v1.0.1...simple-metrics-v1.0.2) (2024-05-17)


### Bug Fixes

* allow creating counter groups ([#2550](https://github.com/libp2p/js-libp2p/issues/2550)) ([8214dcf](https://github.com/libp2p/js-libp2p/commit/8214dcfb0e14e7bf377b5f0d9864551038c069fa))
* update project config ([48444f7](https://github.com/libp2p/js-libp2p/commit/48444f750ebe3f03290bf70e84d7590edc030ea4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.3.1 to ^1.4.0
    * @libp2p/logger bumped from ^4.0.12 to ^4.0.13

## 1.0.0 (2023-09-20)


### Features

* initial import ([dda8a8a](https://github.com/libp2p/js-libp2p-simple-metrics/commit/dda8a8acc357d2d5afa617e63118fa3986857372))


### Bug Fixes

* emit copy of metrics ([#1](https://github.com/libp2p/js-libp2p-simple-metrics/issues/1)) ([ede5c64](https://github.com/libp2p/js-libp2p-simple-metrics/commit/ede5c648f7667ea05dcdb5c9f1e7f8c1d75da922))


### Trivial Changes

* add release script ([107ee5e](https://github.com/libp2p/js-libp2p-simple-metrics/commit/107ee5e1911e6816ad01f854dbf553058eb4e493))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([8175453](https://github.com/libp2p/js-libp2p-simple-metrics/commit/817545386ccf1a01bf10c20851925bdb1cf53970))
* Update .github/workflows/stale.yml [skip ci] ([0705c63](https://github.com/libp2p/js-libp2p-simple-metrics/commit/0705c63daeb84b9e89d9538a6540d871d60d0bc3))
* update project config ([6510681](https://github.com/libp2p/js-libp2p-simple-metrics/commit/65106819fc7c0a359d3b089d827ed99291425c23))
