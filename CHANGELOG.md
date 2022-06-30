## [3.0.3](https://github.com/libp2p/js-libp2p-pubsub/compare/v3.0.2...v3.0.3) (2022-06-30)


### Trivial Changes

* **deps:** bump @libp2p/peer-collections from 1.0.3 to 2.0.0 ([#79](https://github.com/libp2p/js-libp2p-pubsub/issues/79)) ([c066676](https://github.com/libp2p/js-libp2p-pubsub/commit/c06667694053e4d6df1607cce7cffdbe9a3c25c0))

## [3.0.2](https://github.com/libp2p/js-libp2p-pubsub/compare/v3.0.1...v3.0.2) (2022-06-23)


### Bug Fixes

* do not unsubscribe after publish ([#78](https://github.com/libp2p/js-libp2p-pubsub/issues/78)) ([760594e](https://github.com/libp2p/js-libp2p-pubsub/commit/760594e57224e38139a560c37747e52f9dd3e593))

## [3.0.1](https://github.com/libp2p/js-libp2p-pubsub/compare/v3.0.0...v3.0.1) (2022-06-17)


### Bug Fixes

* limit stream concurrency ([#77](https://github.com/libp2p/js-libp2p-pubsub/issues/77)) ([d4f1779](https://github.com/libp2p/js-libp2p-pubsub/commit/d4f1779b68e658211e7a50ba446ec479bb413d2b))

## [3.0.0](https://github.com/libp2p/js-libp2p-pubsub/compare/v2.0.0...v3.0.0) (2022-06-16)


### ⚠ BREAKING CHANGES

* update to simpler connection api

### Trivial Changes

* update deps ([#76](https://github.com/libp2p/js-libp2p-pubsub/issues/76)) ([50d1a5f](https://github.com/libp2p/js-libp2p-pubsub/commit/50d1a5fdb487f264f1f9da1facf96f4da6836649))

## [2.0.0](https://github.com/libp2p/js-libp2p-pubsub/compare/v1.3.0...v2.0.0) (2022-06-15)


### ⚠ BREAKING CHANGES

* uses new single-issue libp2p interface modules

Co-authored-by: achingbrain <alex@achingbrain.net>

### Features

* update to latest libp2p interfaces ([#74](https://github.com/libp2p/js-libp2p-pubsub/issues/74)) ([fe38340](https://github.com/libp2p/js-libp2p-pubsub/commit/fe38340715f37f6e976c526bf45e10d649b118dc))

## [@libp2p/pubsub-v1.3.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.24...@libp2p/pubsub-v1.3.0) (2022-05-23)


### Features

* expose utility methods to convert bigint to bytes and back ([#213](https://github.com/libp2p/js-libp2p-interfaces/issues/213)) ([3d2e59c](https://github.com/libp2p/js-libp2p-interfaces/commit/3d2e59c8fd8af5d618df904ae9d40518a13de547))

## [@libp2p/pubsub-v1.2.24](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.23...@libp2p/pubsub-v1.2.24) (2022-05-20)


### Bug Fixes

* update interfaces ([#215](https://github.com/libp2p/js-libp2p-interfaces/issues/215)) ([72e6890](https://github.com/libp2p/js-libp2p-interfaces/commit/72e6890826dadbd6e7cbba5536bde350ca4286e6))

## [@libp2p/pubsub-v1.2.23](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.22...@libp2p/pubsub-v1.2.23) (2022-05-10)


### Trivial Changes

* **deps:** bump sinon from 13.0.2 to 14.0.0 ([#211](https://github.com/libp2p/js-libp2p-interfaces/issues/211)) ([8859f70](https://github.com/libp2p/js-libp2p-interfaces/commit/8859f70943c0bcdb210f54a338ae901739e5e6f2))

## [@libp2p/pubsub-v1.2.22](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.21...@libp2p/pubsub-v1.2.22) (2022-05-10)


### Bug Fixes

* regenerate protobuf code ([#212](https://github.com/libp2p/js-libp2p-interfaces/issues/212)) ([3cf210e](https://github.com/libp2p/js-libp2p-interfaces/commit/3cf210e230863f8049ac6c3ed2e73abb180fb8b2))

## [@libp2p/pubsub-v1.2.21](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.20...@libp2p/pubsub-v1.2.21) (2022-05-04)


### Bug Fixes

* move startable and events interfaces ([#209](https://github.com/libp2p/js-libp2p-interfaces/issues/209)) ([8ce8a08](https://github.com/libp2p/js-libp2p-interfaces/commit/8ce8a08c94b0738aa32da516558977b195ddd8ed))

## [@libp2p/pubsub-v1.2.20](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.19...@libp2p/pubsub-v1.2.20) (2022-04-22)


### Bug Fixes

* update pubsub interface in line with gossipsub ([#199](https://github.com/libp2p/js-libp2p-interfaces/issues/199)) ([3f55596](https://github.com/libp2p/js-libp2p-interfaces/commit/3f555965cddea3ef03e7217b755c82aa4107e093))

## [@libp2p/pubsub-v1.2.19](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.18...@libp2p/pubsub-v1.2.19) (2022-04-21)


### Bug Fixes

* test PubSub interface and not PubSubBaseProtocol ([#198](https://github.com/libp2p/js-libp2p-interfaces/issues/198)) ([96c15c9](https://github.com/libp2p/js-libp2p-interfaces/commit/96c15c9780821a3cb763e48854d64377bf562692))

## [@libp2p/pubsub-v1.2.18](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.17...@libp2p/pubsub-v1.2.18) (2022-04-20)


### Bug Fixes

* emit pubsub messages using 'message' event ([#197](https://github.com/libp2p/js-libp2p-interfaces/issues/197)) ([df9b685](https://github.com/libp2p/js-libp2p-interfaces/commit/df9b685cea30653109f2fa2cb5583a3bca7b09bb))

## [@libp2p/pubsub-v1.2.17](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.16...@libp2p/pubsub-v1.2.17) (2022-04-19)


### Trivial Changes

* remove extraneous readme ([#196](https://github.com/libp2p/js-libp2p-interfaces/issues/196)) ([ee1d00c](https://github.com/libp2p/js-libp2p-interfaces/commit/ee1d00cc209909836f12f17d62f1165f11689488))

## [@libp2p/pubsub-v1.2.16](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.15...@libp2p/pubsub-v1.2.16) (2022-04-19)


### Bug Fixes

* move dev deps to prod ([#195](https://github.com/libp2p/js-libp2p-interfaces/issues/195)) ([3e1ffc7](https://github.com/libp2p/js-libp2p-interfaces/commit/3e1ffc7b174e74be483943ad4e5fcab823ae3f6d))

## [@libp2p/pubsub-v1.2.15](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.14...@libp2p/pubsub-v1.2.15) (2022-04-13)


### Bug Fixes

* add keychain types, fix bigint types ([#193](https://github.com/libp2p/js-libp2p-interfaces/issues/193)) ([9ceadf9](https://github.com/libp2p/js-libp2p-interfaces/commit/9ceadf9d5c42a12d88d74ddd9140e34f7fa63537))

## [@libp2p/pubsub-v1.2.14](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.13...@libp2p/pubsub-v1.2.14) (2022-04-08)


### Bug Fixes

* swap protobufjs for protons ([#191](https://github.com/libp2p/js-libp2p-interfaces/issues/191)) ([d72b30c](https://github.com/libp2p/js-libp2p-interfaces/commit/d72b30cfca4b9145e0b31db28e8fa3329a180e83))


### Trivial Changes

* update aegir ([#192](https://github.com/libp2p/js-libp2p-interfaces/issues/192)) ([41c1494](https://github.com/libp2p/js-libp2p-interfaces/commit/41c14941e8b67d6601a90b4d48a2776573d55e60))

## [@libp2p/pubsub-v1.2.13](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.12...@libp2p/pubsub-v1.2.13) (2022-03-24)


### Bug Fixes

* rename peer data to peer info ([#187](https://github.com/libp2p/js-libp2p-interfaces/issues/187)) ([dfea342](https://github.com/libp2p/js-libp2p-interfaces/commit/dfea3429bad57abde040397e4e7a58539829e9c2))

## [@libp2p/pubsub-v1.2.12](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.11...@libp2p/pubsub-v1.2.12) (2022-03-21)


### Bug Fixes

* handle empty pubsub messages ([#185](https://github.com/libp2p/js-libp2p-interfaces/issues/185)) ([0db8d84](https://github.com/libp2p/js-libp2p-interfaces/commit/0db8d84dd98ff6e99776c01a6b5bab404033bffa))

## [@libp2p/pubsub-v1.2.11](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.10...@libp2p/pubsub-v1.2.11) (2022-03-20)


### Bug Fixes

* update pubsub types ([#183](https://github.com/libp2p/js-libp2p-interfaces/issues/183)) ([7ef4baa](https://github.com/libp2p/js-libp2p-interfaces/commit/7ef4baad0fe30f783f3eecd5199ef92af08b7f57))

## [@libp2p/pubsub-v1.2.10](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.9...@libp2p/pubsub-v1.2.10) (2022-03-15)


### Bug Fixes

* simplify transport interface, update interfaces for use with libp2p ([#180](https://github.com/libp2p/js-libp2p-interfaces/issues/180)) ([ec81622](https://github.com/libp2p/js-libp2p-interfaces/commit/ec81622e5b7c6d256e0f8aed6d3695642473293b))

## [@libp2p/pubsub-v1.2.9](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.8...@libp2p/pubsub-v1.2.9) (2022-02-27)


### Bug Fixes

* rename crypto to connection-encrypter ([#179](https://github.com/libp2p/js-libp2p-interfaces/issues/179)) ([d197f55](https://github.com/libp2p/js-libp2p-interfaces/commit/d197f554d7cdadb3b05ed2d6c69fda2c4362b1eb))

## [@libp2p/pubsub-v1.2.8](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.7...@libp2p/pubsub-v1.2.8) (2022-02-27)


### Bug Fixes

* update package config and add connection gater interface ([#178](https://github.com/libp2p/js-libp2p-interfaces/issues/178)) ([c6079a6](https://github.com/libp2p/js-libp2p-interfaces/commit/c6079a6367f004788062df3e30ad2e26330d947b))

## [@libp2p/pubsub-v1.2.7](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.6...@libp2p/pubsub-v1.2.7) (2022-02-18)


### Bug Fixes

* simpler pubsub ([#172](https://github.com/libp2p/js-libp2p-interfaces/issues/172)) ([98715ed](https://github.com/libp2p/js-libp2p-interfaces/commit/98715ed73183b32e4fda3d878a462389548358d9))

## [@libp2p/pubsub-v1.2.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.5...@libp2p/pubsub-v1.2.6) (2022-02-17)


### Bug Fixes

* update deps ([#171](https://github.com/libp2p/js-libp2p-interfaces/issues/171)) ([d0d2564](https://github.com/libp2p/js-libp2p-interfaces/commit/d0d2564a84a0722ab587a3aa6ec01e222442b100))

## [@libp2p/pubsub-v1.2.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.4...@libp2p/pubsub-v1.2.5) (2022-02-17)


### Bug Fixes

* add multistream-select and update pubsub types ([#170](https://github.com/libp2p/js-libp2p-interfaces/issues/170)) ([b9ecb2b](https://github.com/libp2p/js-libp2p-interfaces/commit/b9ecb2bee8f2abc0c41bfcf7bf2025894e37ddc2))

## [@libp2p/pubsub-v1.2.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.3...@libp2p/pubsub-v1.2.4) (2022-02-12)


### Bug Fixes

* hide implementations behind factory methods ([#167](https://github.com/libp2p/js-libp2p-interfaces/issues/167)) ([2fba080](https://github.com/libp2p/js-libp2p-interfaces/commit/2fba0800c9896af6dcc49da4fa904bb4a3e3e40d))

## [@libp2p/pubsub-v1.2.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.2...@libp2p/pubsub-v1.2.3) (2022-02-11)


### Bug Fixes

* simpler topologies ([#164](https://github.com/libp2p/js-libp2p-interfaces/issues/164)) ([45fcaa1](https://github.com/libp2p/js-libp2p-interfaces/commit/45fcaa10a6a3215089340ff2eff117d7fd1100e7))

## [@libp2p/pubsub-v1.2.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.1...@libp2p/pubsub-v1.2.2) (2022-02-10)


### Bug Fixes

* make registrar simpler ([#163](https://github.com/libp2p/js-libp2p-interfaces/issues/163)) ([d122f3d](https://github.com/libp2p/js-libp2p-interfaces/commit/d122f3daaccc04039d90814960da92b513265644))

## [@libp2p/pubsub-v1.2.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.2.0...@libp2p/pubsub-v1.2.1) (2022-02-10)


### Bug Fixes

* remove node event emitters ([#161](https://github.com/libp2p/js-libp2p-interfaces/issues/161)) ([221fb6a](https://github.com/libp2p/js-libp2p-interfaces/commit/221fb6a024430dc56288d73d8b8ce1aa88427701))

## [@libp2p/pubsub-v1.2.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.1.0...@libp2p/pubsub-v1.2.0) (2022-02-09)


### Features

* add peer store/records, and streams are just streams ([#160](https://github.com/libp2p/js-libp2p-interfaces/issues/160)) ([8860a0c](https://github.com/libp2p/js-libp2p-interfaces/commit/8860a0cd46b359a5648402d83870f7ff957222fe))

## [@libp2p/pubsub-v1.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.0.6...@libp2p/pubsub-v1.1.0) (2022-02-07)


### Features

* add logger package ([#158](https://github.com/libp2p/js-libp2p-interfaces/issues/158)) ([f327cd2](https://github.com/libp2p/js-libp2p-interfaces/commit/f327cd24825d9ce2f45a02fdb9b47c9735c847e0))

## [@libp2p/pubsub-v1.0.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.0.5...@libp2p/pubsub-v1.0.6) (2022-02-05)


### Bug Fixes

* fix muxer tests ([#157](https://github.com/libp2p/js-libp2p-interfaces/issues/157)) ([7233c44](https://github.com/libp2p/js-libp2p-interfaces/commit/7233c4438479dff56a682f45209ef7a938d63857))

## [@libp2p/pubsub-v1.0.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.0.4...@libp2p/pubsub-v1.0.5) (2022-01-15)


### Bug Fixes

* remove abort controller dep ([#151](https://github.com/libp2p/js-libp2p-interfaces/issues/151)) ([518bce1](https://github.com/libp2p/js-libp2p-interfaces/commit/518bce1f9bd1f8b2922338e0c65c9934af7da3af))

## [@libp2p/pubsub-v1.0.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.0.3...@libp2p/pubsub-v1.0.4) (2022-01-15)


### Trivial Changes

* update project config ([#149](https://github.com/libp2p/js-libp2p-interfaces/issues/149)) ([6eb8556](https://github.com/libp2p/js-libp2p-interfaces/commit/6eb85562c0da167d222808da10a7914daf12970b))

## [@libp2p/pubsub-v1.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.0.2...@libp2p/pubsub-v1.0.3) (2022-01-14)


### Bug Fixes

* update it-* deps to ts versions ([#148](https://github.com/libp2p/js-libp2p-interfaces/issues/148)) ([7a6fdd7](https://github.com/libp2p/js-libp2p-interfaces/commit/7a6fdd7622ce2870b89dbb849ab421d0dd714b43))

## [@libp2p/pubsub-v1.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/pubsub-v1.0.1...@libp2p/pubsub-v1.0.2) (2022-01-08)


### Trivial Changes

* add semantic release config ([#141](https://github.com/libp2p/js-libp2p-interfaces/issues/141)) ([5f0de59](https://github.com/libp2p/js-libp2p-interfaces/commit/5f0de59136b6343d2411abb2d6a4dd2cd0b7efe4))
* update package versions ([#140](https://github.com/libp2p/js-libp2p-interfaces/issues/140)) ([cd844f6](https://github.com/libp2p/js-libp2p-interfaces/commit/cd844f6e39f4ee50d006e86eac8dadf696900eb5))

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.2.0 (2022-01-04)


### chore

* update libp2p-crypto and peer-id ([c711e8b](https://github.com/libp2p/js-libp2p-interfaces/commit/c711e8bd4d606f6974b13fad2eeb723f93cebb87))


### Features

* add auto-publish ([7aede5d](https://github.com/libp2p/js-libp2p-interfaces/commit/7aede5df39ea6b5f243348ec9a212b3e33c16a81))
* simpler peer id ([#117](https://github.com/libp2p/js-libp2p-interfaces/issues/117)) ([fa2c4f5](https://github.com/libp2p/js-libp2p-interfaces/commit/fa2c4f5be74a5cfc11489771881e57b4e53bf174))
* split out code, convert to typescript ([#111](https://github.com/libp2p/js-libp2p-interfaces/issues/111)) ([e174bba](https://github.com/libp2p/js-libp2p-interfaces/commit/e174bba889388269b806643c79a6b53c8d6a0f8c)), closes [#110](https://github.com/libp2p/js-libp2p-interfaces/issues/110) [#101](https://github.com/libp2p/js-libp2p-interfaces/issues/101)
* update package names ([#133](https://github.com/libp2p/js-libp2p-interfaces/issues/133)) ([337adc9](https://github.com/libp2p/js-libp2p-interfaces/commit/337adc9a9bc0278bdae8cbce9c57d07a83c8b5c2))


### BREAKING CHANGES

* requires node 15+
* not all fields from concrete classes have been added to the interfaces, some adjustment may be necessary as this gets rolled out





## [0.9.1](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-pubsub@0.9.0...libp2p-pubsub@0.9.1) (2022-01-02)

**Note:** Version bump only for package libp2p-pubsub





# [0.9.0](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-pubsub@0.8.0...libp2p-pubsub@0.9.0) (2022-01-02)


### Features

* simpler peer id ([#117](https://github.com/libp2p/js-libp2p-interfaces/issues/117)) ([fa2c4f5](https://github.com/libp2p/js-libp2p-interfaces/commit/fa2c4f5be74a5cfc11489771881e57b4e53bf174))





# [0.8.0](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-pubsub@0.7.0...libp2p-pubsub@0.8.0) (2021-12-02)


### chore

* update libp2p-crypto and peer-id ([c711e8b](https://github.com/libp2p/js-libp2p-interfaces/commit/c711e8bd4d606f6974b13fad2eeb723f93cebb87))


### BREAKING CHANGES

* requires node 15+





# 0.7.0 (2021-11-22)


### Features

* split out code, convert to typescript ([#111](https://github.com/libp2p/js-libp2p-interfaces/issues/111)) ([e174bba](https://github.com/libp2p/js-libp2p-interfaces/commit/e174bba889388269b806643c79a6b53c8d6a0f8c)), closes [#110](https://github.com/libp2p/js-libp2p-interfaces/issues/110) [#101](https://github.com/libp2p/js-libp2p-interfaces/issues/101)


### BREAKING CHANGES

* not all fields from concrete classes have been added to the interfaces, some adjustment may be necessary as this gets rolled out
