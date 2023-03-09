## [5.0.5](https://github.com/libp2p/js-libp2p-websockets/compare/v5.0.4...v5.0.5) (2023-03-09)


### Trivial Changes

* Update .github/workflows/semantic-pull-request.yml [skip ci] ([4936a70](https://github.com/libp2p/js-libp2p-websockets/commit/4936a70ef1d148aab69c4c659ba2e3a7724918d6))


### Dependencies

* **dev:** bump @libp2p/interface-mocks from 8.0.5 to 9.1.3 ([#220](https://github.com/libp2p/js-libp2p-websockets/issues/220)) ([1076b05](https://github.com/libp2p/js-libp2p-websockets/commit/1076b05ccd3bc3f5a0115759baa1f438f66416da))
* **dev:** bump aegir from 37.12.1 to 38.1.7 ([#219](https://github.com/libp2p/js-libp2p-websockets/issues/219)) ([4e0f17b](https://github.com/libp2p/js-libp2p-websockets/commit/4e0f17b04ba4f62b72d91a3c343d748d79ca4000))

## [5.0.4](https://github.com/libp2p/js-libp2p-websockets/compare/v5.0.3...v5.0.4) (2023-03-03)


### Bug Fixes

* Only filter by wss not dns ([#218](https://github.com/libp2p/js-libp2p-websockets/issues/218)) ([434d44c](https://github.com/libp2p/js-libp2p-websockets/commit/434d44cdfcbab48008a160cca2da1129cb43860b))


### Trivial Changes

* Update .github/workflows/semantic-pull-request.yml [skip ci] ([fad99cc](https://github.com/libp2p/js-libp2p-websockets/commit/fad99cca84037922b62785829fb67c6110ea4c16))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([b1954aa](https://github.com/libp2p/js-libp2p-websockets/commit/b1954aad07080a24db9021ea2736d34a4e444d00))

## [5.0.3](https://github.com/libp2p/js-libp2p-websockets/compare/v5.0.2...v5.0.3) (2023-01-13)


### Dependencies

* remove err-code ([#202](https://github.com/libp2p/js-libp2p-websockets/issues/202)) ([40ce006](https://github.com/libp2p/js-libp2p-websockets/commit/40ce0060918cb390b343a748036af4aee43b2146))

## [5.0.2](https://github.com/libp2p/js-libp2p-websockets/compare/v5.0.1...v5.0.2) (2022-12-16)


### Documentation

* publish api docs ([#201](https://github.com/libp2p/js-libp2p-websockets/issues/201)) ([722b03a](https://github.com/libp2p/js-libp2p-websockets/commit/722b03a7a57200505aebac018aeb06ba85219721))

## [5.0.1](https://github.com/libp2p/js-libp2p-websockets/compare/v5.0.0...v5.0.1) (2022-12-08)


### Bug Fixes

* cannot catch EADDRINUSE ([#198](https://github.com/libp2p/js-libp2p-websockets/issues/198)) ([c7312db](https://github.com/libp2p/js-libp2p-websockets/commit/c7312db639b37c767afe0651cab9d33a6f0246b3)), closes [#184](https://github.com/libp2p/js-libp2p-websockets/issues/184)


### Dependencies

* **dev:** bump @libp2p/interface-mocks from 7.1.0 to 8.0.2 ([#199](https://github.com/libp2p/js-libp2p-websockets/issues/199)) ([daff533](https://github.com/libp2p/js-libp2p-websockets/commit/daff53335baec84ae97d937ab79779f475c8ab18)), closes [#318](https://github.com/libp2p/js-libp2p-websockets/issues/318) [#315](https://github.com/libp2p/js-libp2p-websockets/issues/315) [#313](https://github.com/libp2p/js-libp2p-websockets/issues/313) [#312](https://github.com/libp2p/js-libp2p-websockets/issues/312)
* **dev:** bump it-all from 1.0.6 to 2.0.0 ([#193](https://github.com/libp2p/js-libp2p-websockets/issues/193)) ([6213f8f](https://github.com/libp2p/js-libp2p-websockets/commit/6213f8f6f113846622c53966478ae75c81fa5d14)), closes [#28](https://github.com/libp2p/js-libp2p-websockets/issues/28) [#28](https://github.com/libp2p/js-libp2p-websockets/issues/28) [#27](https://github.com/libp2p/js-libp2p-websockets/issues/27) [#24](https://github.com/libp2p/js-libp2p-websockets/issues/24)
* **dev:** bump it-drain from 1.0.5 to 2.0.0 ([#191](https://github.com/libp2p/js-libp2p-websockets/issues/191)) ([e549691](https://github.com/libp2p/js-libp2p-websockets/commit/e549691e40577f9146355998cb504f071772e4e3)), closes [#28](https://github.com/libp2p/js-libp2p-websockets/issues/28) [#28](https://github.com/libp2p/js-libp2p-websockets/issues/28) [#27](https://github.com/libp2p/js-libp2p-websockets/issues/27) [#24](https://github.com/libp2p/js-libp2p-websockets/issues/24)
* **dev:** bump it-take from 1.0.2 to 2.0.0 ([#192](https://github.com/libp2p/js-libp2p-websockets/issues/192)) ([4c037fc](https://github.com/libp2p/js-libp2p-websockets/commit/4c037fc3c116a3ed2ec39aec3fed776fcb6c9690)), closes [#28](https://github.com/libp2p/js-libp2p-websockets/issues/28)

## [5.0.0](https://github.com/libp2p/js-libp2p-websockets/compare/v4.0.1...v5.0.0) (2022-10-12)


### ⚠ BREAKING CHANGES

* modules no longer implement `Initializable` instead switching to constructor injection

### Bug Fixes

* remove @libp2p/components ([#190](https://github.com/libp2p/js-libp2p-websockets/issues/190)) ([388b30d](https://github.com/libp2p/js-libp2p-websockets/commit/388b30d1c1024e2f7fd9d8bea85701d997f59dbb))

## [4.0.1](https://github.com/libp2p/js-libp2p-websockets/compare/v4.0.0...v4.0.1) (2022-10-07)


### Dependencies

* **dev:** bump @libp2p/interface-mocks from 4.0.3 to 6.0.1 ([#189](https://github.com/libp2p/js-libp2p-websockets/issues/189)) ([00b33f0](https://github.com/libp2p/js-libp2p-websockets/commit/00b33f07a9af8446dcf94a4a0567994f6deefcbf))

## [4.0.0](https://github.com/libp2p/js-libp2p-websockets/compare/v3.0.4...v4.0.0) (2022-10-07)


### ⚠ BREAKING CHANGES

* bump @libp2p/interface-transport from 1.0.4 to 2.0.0 (#187)

### Dependencies

* bump @libp2p/interface-transport from 1.0.4 to 2.0.0 ([#187](https://github.com/libp2p/js-libp2p-websockets/issues/187)) ([bfeaf1b](https://github.com/libp2p/js-libp2p-websockets/commit/bfeaf1bc695c2becff8c47839726f8105269ad9c))

## [3.0.4](https://github.com/libp2p/js-libp2p-websockets/compare/v3.0.3...v3.0.4) (2022-09-21)


### Bug Fixes

* remove set timeout ([#182](https://github.com/libp2p/js-libp2p-websockets/issues/182)) ([23518b0](https://github.com/libp2p/js-libp2p-websockets/commit/23518b0dad79d2c38bca8d600bd763703534b7a6)), closes [#121](https://github.com/libp2p/js-libp2p-websockets/issues/121)
* socket close event not working in browser ([#183](https://github.com/libp2p/js-libp2p-websockets/issues/183)) ([9076b5b](https://github.com/libp2p/js-libp2p-websockets/commit/9076b5bade8dd453b98fc73f0dc0bddaba0fe882)), closes [#179](https://github.com/libp2p/js-libp2p-websockets/issues/179)


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([64411ee](https://github.com/libp2p/js-libp2p-websockets/commit/64411eef588a57adb65868940e489f0badfb579d))


### Dependencies

* update @multiformats/multiaddr to 11.0.0 ([#185](https://github.com/libp2p/js-libp2p-websockets/issues/185)) ([539db88](https://github.com/libp2p/js-libp2p-websockets/commit/539db8806dc7748f9c5d6c8ba785a3c78bb92c62))

## [3.0.3](https://github.com/libp2p/js-libp2p-websockets/compare/v3.0.2...v3.0.3) (2022-09-01)


### Trivial Changes

* update project config ([#180](https://github.com/libp2p/js-libp2p-websockets/issues/180)) ([4f79f9c](https://github.com/libp2p/js-libp2p-websockets/commit/4f79f9ce789a566b99c57597d2d71e2bce40fd6e))


### Dependencies

* **dev:** bump wherearewe from 1.0.2 to 2.0.1 ([#177](https://github.com/libp2p/js-libp2p-websockets/issues/177)) ([5d7ae6a](https://github.com/libp2p/js-libp2p-websockets/commit/5d7ae6a5c22c57e7f47f32405fd57ece98664e4d))

## [3.0.2](https://github.com/libp2p/js-libp2p-websockets/compare/v3.0.1...v3.0.2) (2022-08-10)


### Bug Fixes

* update all deps ([#176](https://github.com/libp2p/js-libp2p-websockets/issues/176)) ([4825cd7](https://github.com/libp2p/js-libp2p-websockets/commit/4825cd7c5cec0cfc495b8b4286658927779bebdc))
* update dial function return type to avoid Connection import issue ([#171](https://github.com/libp2p/js-libp2p-websockets/issues/171)) ([7ea9f83](https://github.com/libp2p/js-libp2p-websockets/commit/7ea9f83c0e4c3b42ba6e16e3dee1932ddce340f6))

## [3.0.1](https://github.com/libp2p/js-libp2p-websockets/compare/v3.0.0...v3.0.1) (2022-07-12)


### Trivial Changes

* **deps-dev:** bump @libp2p/interface-mocks from 2.1.0 to 3.0.1 ([#168](https://github.com/libp2p/js-libp2p-websockets/issues/168)) ([8a17ed7](https://github.com/libp2p/js-libp2p-websockets/commit/8a17ed7eb70e7ac90053cd591bb1e6f331915341))
* **deps:** bump @libp2p/utils from 2.0.1 to 3.0.0 ([#167](https://github.com/libp2p/js-libp2p-websockets/issues/167)) ([53ba721](https://github.com/libp2p/js-libp2p-websockets/commit/53ba7218d19068e2a6b038ecbea65993af7bd745))
* update websockets import var ([#165](https://github.com/libp2p/js-libp2p-websockets/issues/165)) ([838b69e](https://github.com/libp2p/js-libp2p-websockets/commit/838b69e04d435e55d038e49f2df66322d986a2e3))

## [3.0.0](https://github.com/libp2p/js-libp2p-websockets/compare/v2.0.1...v3.0.0) (2022-06-17)


### ⚠ BREAKING CHANGES

* the connection API has changed

### Trivial Changes

* **deps:** bump @libp2p/logger from 1.1.6 to 2.0.0 ([#160](https://github.com/libp2p/js-libp2p-websockets/issues/160)) ([9074c4a](https://github.com/libp2p/js-libp2p-websockets/commit/9074c4a6725b750a3f8c602aa2655c095d83973d))
* update deps ([#164](https://github.com/libp2p/js-libp2p-websockets/issues/164)) ([d474a81](https://github.com/libp2p/js-libp2p-websockets/commit/d474a8184a0eec4c09c2ced5dd5d6314be536fb3))

## [2.0.1](https://github.com/libp2p/js-libp2p-websockets/compare/v2.0.0...v2.0.1) (2022-06-16)


### Trivial Changes

* **deps:** bump @libp2p/utils from 1.0.10 to 2.0.0 ([#161](https://github.com/libp2p/js-libp2p-websockets/issues/161)) ([39980fc](https://github.com/libp2p/js-libp2p-websockets/commit/39980fc7fe994a341fd7f2e8a63738a58cfd1b02))

## [2.0.0](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.9...v2.0.0) (2022-06-15)


### ⚠ BREAKING CHANGES

* uses new single-issue libp2p interface modules

### Features

* update to latest interfaces ([#159](https://github.com/libp2p/js-libp2p-websockets/issues/159)) ([e140bed](https://github.com/libp2p/js-libp2p-websockets/commit/e140bed0ae98af8ef0f7b3d6ec2388fa6273e590))


### Trivial Changes

* increase timeout for firefox ([5098e19](https://github.com/libp2p/js-libp2p-websockets/commit/5098e19796975e29ec91b62f28b52797dc1defde))

### [1.0.9](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.8...v1.0.9) (2022-05-23)


### Bug Fixes

* update interfaces and use static string for toStringTag ([#157](https://github.com/libp2p/js-libp2p-websockets/issues/157)) ([0c93585](https://github.com/libp2p/js-libp2p-websockets/commit/0c93585d0d5cb67c15ba0046b68aa3b196290e12))

### [1.0.8](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.7...v1.0.8) (2022-05-06)


### Bug Fixes

* hard code tag ([#154](https://github.com/libp2p/js-libp2p-websockets/issues/154)) ([c36aebb](https://github.com/libp2p/js-libp2p-websockets/commit/c36aebb9a38434c3e2127b9251427aba53bbb09f))

### [1.0.7](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.6...v1.0.7) (2022-05-04)


### Bug Fixes

* update interfaces ([#153](https://github.com/libp2p/js-libp2p-websockets/issues/153)) ([57c5887](https://github.com/libp2p/js-libp2p-websockets/commit/57c588716627270bbc42ee5e5c4249b99b9af5e5))

### [1.0.6](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.5...v1.0.6) (2022-04-11)


### Bug Fixes

* remove entrypoint config ([#152](https://github.com/libp2p/js-libp2p-websockets/issues/152)) ([cf2334e](https://github.com/libp2p/js-libp2p-websockets/commit/cf2334e8f5063dc98d34776b81e3dad13e761e6e))

### [1.0.5](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.4...v1.0.5) (2022-04-09)


### Trivial Changes

* update tsconfig ([#151](https://github.com/libp2p/js-libp2p-websockets/issues/151)) ([c54d349](https://github.com/libp2p/js-libp2p-websockets/commit/c54d3495d8bc53eaa1e1f4c99d9da404652f5a8d))

### [1.0.4](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.3...v1.0.4) (2022-04-08)


### Trivial Changes

* update aegir ([#150](https://github.com/libp2p/js-libp2p-websockets/issues/150)) ([6c08294](https://github.com/libp2p/js-libp2p-websockets/commit/6c08294e98807e789b791286931d120cfef679cd))

### [1.0.3](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.2...v1.0.3) (2022-03-16)


### Bug Fixes

* update interfaces ([#146](https://github.com/libp2p/js-libp2p-websockets/issues/146)) ([26ef08b](https://github.com/libp2p/js-libp2p-websockets/commit/26ef08bd243ddf714a32acdb6e2a7392209af355))

### [1.0.2](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.1...v1.0.2) (2022-02-21)


### Bug Fixes

* update interfaces ([#145](https://github.com/libp2p/js-libp2p-websockets/issues/145)) ([213ebc5](https://github.com/libp2p/js-libp2p-websockets/commit/213ebc5f85c749d712e1441b5fe49dc636e25f64))

### [1.0.1](https://github.com/libp2p/js-libp2p-websockets/compare/v1.0.0...v1.0.1) (2022-02-16)


### Bug Fixes

* add toStringTag and export filters ([#142](https://github.com/libp2p/js-libp2p-websockets/issues/142)) ([03fd000](https://github.com/libp2p/js-libp2p-websockets/commit/03fd000088ac78ea25f8cdf123fbbe8923257ca4))
* update typesversions ([1cfbc28](https://github.com/libp2p/js-libp2p-websockets/commit/1cfbc28f93adecb1a9b60f53ef5815c87d00c93c))

## [1.0.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.16.2...v1.0.0) (2022-02-10)


### ⚠ BREAKING CHANGES

* switch to named exports, ESM only

### Features

* convert to typescript ([#76](https://github.com/libp2p/js-libp2p-websockets/issues/76)) ([#140](https://github.com/libp2p/js-libp2p-websockets/issues/140)) ([c4f6508](https://github.com/libp2p/js-libp2p-websockets/commit/c4f65082a97def50524e56231ce6c84eddf99521)), closes [#139](https://github.com/libp2p/js-libp2p-websockets/issues/139)

## [0.16.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.16.1...v0.16.2) (2021-09-28)



## [0.16.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.16.0...v0.16.1) (2021-07-08)



# [0.16.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.9...v0.16.0) (2021-07-07)


### chore

* update deps ([#134](https://github.com/libp2p/js-libp2p-websockets/issues/134)) ([27f6c41](https://github.com/libp2p/js-libp2p-websockets/commit/27f6c4175bd6d5ea3e727a9a6e43136c806077cc))


### BREAKING CHANGES

* uses new major of mafmt, multiaddr, etc



## [0.15.9](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.8...v0.15.9) (2021-06-11)



## [0.15.8](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.7...v0.15.8) (2021-06-08)


### Bug Fixes

* listener get addrs with wss ([#130](https://github.com/libp2p/js-libp2p-websockets/issues/130)) ([ee47570](https://github.com/libp2p/js-libp2p-websockets/commit/ee47570ff79a51b8f3c3414934d5f7ab9d00f74d))



## [0.15.7](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.6...v0.15.7) (2021-05-04)



## [0.15.6](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.5...v0.15.6) (2021-04-18)



## [0.15.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.4...v0.15.5) (2021-04-12)



## [0.15.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.3...v0.15.4) (2021-03-31)



## [0.15.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.2...v0.15.3) (2021-02-22)



## [0.15.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.1...v0.15.2) (2021-02-09)


### Bug Fixes

* add error event handler ([#118](https://github.com/libp2p/js-libp2p-websockets/issues/118)) ([577d350](https://github.com/libp2p/js-libp2p-websockets/commit/577d3505f559b153ec9e0bbca7d31d2f164712bc))



## [0.15.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.0...v0.15.1) (2021-02-05)


### Bug Fixes

* incompatibility with @evanw/esbuild[#740](https://github.com/libp2p/js-libp2p-websockets/issues/740) ([#120](https://github.com/libp2p/js-libp2p-websockets/issues/120)) ([96244f0](https://github.com/libp2p/js-libp2p-websockets/commit/96244f048929c5225905327ae27a88961fe535f8))



# [0.15.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.1...v0.15.0) (2020-11-24)


### Bug Fixes

* add buffer ([#112](https://github.com/libp2p/js-libp2p-websockets/issues/112)) ([8065e07](https://github.com/libp2p/js-libp2p-websockets/commit/8065e07bad57b5732cdcec5ce3829ac2361604cf))
* catch thrown maConn errors in listener ([8bfb19a](https://github.com/libp2p/js-libp2p-websockets/commit/8bfb19a78f296c10d8e1a3c0ac608daa9ffcfefc))
* remove use of assert module ([#101](https://github.com/libp2p/js-libp2p-websockets/issues/101)) ([89d3723](https://github.com/libp2p/js-libp2p-websockets/commit/89d37232b8f603804b6ce5cd8230cc75d2dd8e28))
* replace node buffers with uint8arrays ([#115](https://github.com/libp2p/js-libp2p-websockets/issues/115)) ([a277bf6](https://github.com/libp2p/js-libp2p-websockets/commit/a277bf6bfbc7ad796e51f7646d7449c203384c06))


### Features

* custom address filter ([#116](https://github.com/libp2p/js-libp2p-websockets/issues/116)) ([711c721](https://github.com/libp2p/js-libp2p-websockets/commit/711c721b033d28b3c57c37bf9ca98d0f5d2a58b6))


### BREAKING CHANGES

* Only DNS+WSS addresses are now returned on filter by default in the browser. This can be overritten by the filter option and filters are provided in the module.



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.6...v0.14.0) (2020-08-11)


### Bug Fixes

* replace node buffers with uint8arrays ([#115](https://github.com/libp2p/js-libp2p-websockets/issues/115)) ([a277bf6](https://github.com/libp2p/js-libp2p-websockets/commit/a277bf6))


### BREAKING CHANGES

* - All deps used by this module now use Uint8Arrays in place of Buffers

* chore: remove gh dep



<a name="0.13.6"></a>
## [0.13.6](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.5...v0.13.6) (2020-03-23)


### Bug Fixes

* add buffer ([#112](https://github.com/libp2p/js-libp2p-websockets/issues/112)) ([8065e07](https://github.com/libp2p/js-libp2p-websockets/commit/8065e07))



<a name="0.13.5"></a>
## [0.13.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.4...v0.13.5) (2020-02-26)


### Bug Fixes

* catch thrown maConn errors in listener ([8bfb19a](https://github.com/libp2p/js-libp2p-websockets/commit/8bfb19a))



<a name="0.13.4"></a>
## [0.13.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.3...v0.13.4) (2020-02-14)


### Bug Fixes

* remove use of assert module ([#101](https://github.com/libp2p/js-libp2p-websockets/issues/101)) ([89d3723](https://github.com/libp2p/js-libp2p-websockets/commit/89d3723))



<a name="0.13.3"></a>
## [0.13.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.2...v0.13.3) (2020-02-07)



<a name="0.13.2"></a>
## [0.13.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.1...v0.13.2) (2019-12-20)



<a name="0.13.1"></a>
## [0.13.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.0...v0.13.1) (2019-10-30)


### Bug Fixes

* catch inbound upgrade errors ([#96](https://github.com/libp2p/js-libp2p-websockets/issues/96)) ([5b59fc3](https://github.com/libp2p/js-libp2p-websockets/commit/5b59fc3))
* support bufferlist usage ([#97](https://github.com/libp2p/js-libp2p-websockets/issues/97)) ([3bf66d0](https://github.com/libp2p/js-libp2p-websockets/commit/3bf66d0))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.3...v0.13.0) (2019-09-30)


### Code Refactoring

* async with multiaddr conn ([#92](https://github.com/libp2p/js-libp2p-websockets/issues/92)) ([ce7bf4f](https://github.com/libp2p/js-libp2p-websockets/commit/ce7bf4f))


### BREAKING CHANGES

* Switch to using async/await and async iterators. The transport and connection interfaces have changed. See the README for new usage.



<a name="0.12.3"></a>
## [0.12.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.2...v0.12.3) (2019-08-21)



<a name="0.12.2"></a>
## [0.12.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.1...v0.12.2) (2019-01-24)


### Bug Fixes

* ipv6 naming with multiaddr-to-uri package ([#81](https://github.com/libp2p/js-libp2p-websockets/issues/81)) ([93ef7c3](https://github.com/libp2p/js-libp2p-websockets/commit/93ef7c3))



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.0...v0.12.1) (2019-01-10)


### Bug Fixes

* reduce bundle size ([68ae2c3](https://github.com/libp2p/js-libp2p-websockets/commit/68ae2c3))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.11.0...v0.12.0) (2018-04-30)



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.5...v0.11.0) (2018-04-05)


### Features

* add class-is module ([#72](https://github.com/libp2p/js-libp2p-websockets/issues/72)) ([f59cf88](https://github.com/libp2p/js-libp2p-websockets/commit/f59cf88))
* Pass options to websocket server ([#66](https://github.com/libp2p/js-libp2p-websockets/issues/66)) ([709989a](https://github.com/libp2p/js-libp2p-websockets/commit/709989a))



<a name="0.10.5"></a>
## [0.10.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.4...v0.10.5) (2018-02-20)



<a name="0.10.4"></a>
## [0.10.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.2...v0.10.4) (2017-10-22)



<a name="0.10.3"></a>
## [0.10.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.2...v0.10.3) (2017-10-22)



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.1...v0.10.2) (2017-10-20)


### Features

* filter IPFS addrs correctly ([#62](https://github.com/libp2p/js-libp2p-websockets/issues/62)) ([9ddff85](https://github.com/libp2p/js-libp2p-websockets/commit/9ddff85)), closes [#64](https://github.com/libp2p/js-libp2p-websockets/issues/64)
* new aegir  ([3d3cdf1](https://github.com/libp2p/js-libp2p-websockets/commit/3d3cdf1))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.0...v0.10.1) (2017-07-22)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.6...v0.10.0) (2017-03-27)


### Bug Fixes

* **dial:** pass through errors from pull-ws onConnect ([8df8084](https://github.com/libp2p/js-libp2p-websockets/commit/8df8084))



<a name="0.9.6"></a>
## [0.9.6](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.5...v0.9.6) (2017-03-23)


### Bug Fixes

* address parsing ([#57](https://github.com/libp2p/js-libp2p-websockets/issues/57)) ([9fbbe3f](https://github.com/libp2p/js-libp2p-websockets/commit/9fbbe3f))



<a name="0.9.5"></a>
## [0.9.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.4...v0.9.5) (2017-03-23)



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.2...v0.9.4) (2017-03-21)



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.1...v0.9.2) (2017-02-09)



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.0...v0.9.1) (2016-11-08)


### Bug Fixes

* onConnect does not follow callback pattern ([#36](https://github.com/libp2p/js-libp2p-websockets/issues/36)) ([a821c33](https://github.com/libp2p/js-libp2p-websockets/commit/a821c33))
* the fix ([0429beb](https://github.com/libp2p/js-libp2p-websockets/commit/0429beb))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.8.1...v0.9.0) (2016-11-03)


### Features

* upgrade to aegir@9 ([#33](https://github.com/libp2p/js-libp2p-websockets/issues/33)) ([e73c99e](https://github.com/libp2p/js-libp2p-websockets/commit/e73c99e))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.8.0...v0.8.1) (2016-09-06)


### Features

* **readme:** update pull-streams section ([64c57f5](https://github.com/libp2p/js-libp2p-websockets/commit/64c57f5))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.7.2...v0.8.0) (2016-09-06)


### Features

* **pull:** migrate to pull streams ([3f58dca](https://github.com/libp2p/js-libp2p-websockets/commit/3f58dca))
* **readme:** complete the readme, adding reference about pull-streams ([b62560e](https://github.com/libp2p/js-libp2p-websockets/commit/b62560e))



<a name="0.7.2"></a>
## [0.7.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.7.1...v0.7.2) (2016-08-29)


### Bug Fixes

* **style:** reduce nested callbacks ([33f5fb3](https://github.com/libp2p/js-libp2p-websockets/commit/33f5fb3))



<a name="0.7.1"></a>
## [0.7.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.7.0...v0.7.1) (2016-08-03)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.6.1...v0.7.0) (2016-06-22)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.6.0...v0.6.1) (2016-05-29)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.5.0...v0.6.0) (2016-05-22)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.4.4...v0.5.0) (2016-05-17)



<a name="0.4.4"></a>
## [0.4.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.4.3...v0.4.4) (2016-05-08)


### Bug Fixes

* improve close handling ([cd89354](https://github.com/libp2p/js-libp2p-websockets/commit/cd89354))



<a name="0.4.3"></a>
## [0.4.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.4.1...v0.4.3) (2016-05-08)



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.3.2...v0.4.1) (2016-04-25)



<a name="0.3.2"></a>
## [0.3.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.2.2...v0.3.2) (2016-04-14)



<a name="0.2.2"></a>
## [0.2.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.2.1...v0.2.2) (2016-04-14)



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.2.0...v0.2.1) (2016-03-20)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.1.0...v0.2.0) (2016-03-14)



<a name="0.1.0"></a>
# 0.1.0 (2016-02-26)
