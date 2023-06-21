import { readFile, writeFile } from 'fs/promises'

const pkg = JSON.parse(
  await readFile(
    new URL('../package.json', import.meta.url)
  )
)

await writeFile(
  new URL('../src/version.ts', import.meta.url),
  `export const version = '${pkg.version}'
export const name = '${pkg.name}'
`
)
