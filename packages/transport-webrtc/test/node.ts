import { readFile } from 'node:fs/promises'
import { expect } from 'aegir/chai'

// Only Node runs this file; browser tests do not need filesystem access.
describe('package dependencies', () => {
  it('keeps React Native WebRTC optional for Node consumers', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8'))
    const dependency = 'react-native-webrtc'

    expect(pkg.dependencies).to.not.have.property(dependency)
    expect(pkg.optionalDependencies ?? {}).to.not.have.property(dependency)
    expect(pkg.peerDependencies[dependency]).to.equal(pkg.devDependencies[dependency])
    expect(pkg.peerDependenciesMeta[dependency]).to.have.property('optional', true)
    expect(pkg['react-native']['./dist/src/webrtc/index.js']).to.equal('./dist/src/webrtc/index.react-native.js')
  })
})
