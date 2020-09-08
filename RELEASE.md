# Release Template

> short tl;dr; of the release

# 🗺 What's left for release

# 🔦 Highlights

# 🏗 API Changes

# ✅ Release Checklist

- Robustness and quality
  - [ ] Ensure that all tests are passing, this includes:
    - [ ] unit
  - [ ] Publish a release candidate to npm
    ```sh
    # Minor prerelease (e.g. 0.24.1 -> 0.25.0-rc.0)
    $ npx aegir release --type preminor -t node -t browser --preid rc --dist-tag next

    # Increment prerelease (e.g. 0.25.0-rc.0 -> 0.25.0-rc.1)
    $ npx aegir release --type prerelease -t node -t browser --preid rc --dist-tag next
    ```
  - [ ] Run tests of the following projects with the new release:
    - [ ] [js-ipfs](https://github.com/ipfs/js-ipfs)
- Documentation
  - [ ] Ensure that README.md is up to date
  - [ ] Ensure that all the examples run
  - [ ] Ensure [libp2p/js-libp2p-examples](https://github.com/libp2p/js-libp2p-examples) is updated
  - [ ] Ensure that [libp2p/docs](https://github.com/libp2p/docs) is updated
- Communication
  - [ ] Create the release issue
  - [ ] Take a snapshot between of everyone that has contributed to this release (including its subdeps in IPFS, libp2p, IPLD and multiformats) using [`name-your-contributors`](https://www.npmjs.com/package/name-your-contributors). Generate a nice markdown list with [this script](https://gist.github.com/jacobheun/d2ff479ca991733c13cdcf688a1317e5)
  - [ ] Announcements (both pre-release and post-release)
    - [ ] Twitter
    - [ ] IRC
    - [ ] Reddit
    - [ ] [discuss.libp2p.io](https://discuss.libp2p.io/c/news)
  - [ ] Blog post
  - [ ] Copy release notes to the [GitHub Release description](https://github.com/libp2p/js-libp2p/releases)

# ❤️ Huge thank you to everyone that made this release possible

In alphabetical order, here are all the humans that contributed to the release:

- ...

# 🙌🏽 Want to contribute?

Would you like to contribute to the libp2p project and don't know how? Well, there are a few places you can get started:

- Check the issues with the `help wanted` label in the [libp2p repo](https://github.com/libp2p/js-libp2p/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22)
- Join an IPFS All Hands, introduce yourself and let us know where you would like to contribute - https://github.com/ipfs/team-mgmt#all-hands-call
- Hack with IPFS and show us what you made! The All Hands call is also the perfect venue for demos, join in and show us what you built
- Join the discussion at http://discuss.libp2p.io/ and help users finding their answers.
- Join the [⚡️libp2p Weekly Sync 🙌🏽](https://github.com/libp2p/team-mgmt/issues/16) and be part of the Sprint action!

# ⁉️ Do you have questions?

The best place to ask your questions about libp2p, how it works and what you can do with it is at [discuss.libp2p.io](https://discuss.libp2p.io). We are also available at the #libp2p channel on Freenode.
