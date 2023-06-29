interface TestResult {
  previousUploadBandwidth: number
  currentUploadBandwidth: number
  previousDownloadBandwidth: number
  currentDownloadBandwidth: number
}

interface TestEnvironment {
  name: string
  results: TestResult
}

export function generateMarkdownTable (environments: TestEnvironment[]): string {
  const headerRow =
    '| Environment | Previous Upload Bandwidth | Current Upload Bandwidth | Upload Bandwidth Comparison | Previous Download Bandwidth | Current Download Bandwidth | Download Bandwidth Comparison |\n'
  const separatorRow =
    '|-------------|--------------------------|-------------------------|-----------------------------|-----------------------------|----------------------------|-----------------------------|\n'
  let bodyRows = ''

  environments.forEach((environment) => {
    const { name, results } = environment
    const { previousUploadBandwidth, currentUploadBandwidth, previousDownloadBandwidth, currentDownloadBandwidth } = results

    const uploadComparison = currentUploadBandwidth <= 0.95 * previousUploadBandwidth ? '❌' : '✅'
    const downloadComparison = currentDownloadBandwidth <= 0.95 * previousDownloadBandwidth ? '❌' : '✅'

    const row = `| ${name} | ${previousUploadBandwidth} B/s | ${currentUploadBandwidth} B/s | ${uploadComparison} | ${previousDownloadBandwidth} B/s | ${currentDownloadBandwidth} B/s| ${downloadComparison} |\n`
    bodyRows += row
  })

  return `${headerRow}${separatorRow}${bodyRows}`
}

const testEnvironments: TestEnvironment[] = []

const jsonObject = JSON.parse(process.env.BANDWIDTH_TEST_RESULTS ?? '')

for (const name in jsonObject) {
  if (Object.prototype.hasOwnProperty.call(jsonObject, name)) {
    const testResult = jsonObject[name]
    const testEnvironment: TestEnvironment = {
      name: name,
      results: testResult
    }
    testEnvironments.push(testEnvironment)
  }
}

const markdownTable = generateMarkdownTable(testEnvironments)
// eslint-disable-next-line no-console
console.log(markdownTable)
