export interface TestSetup<T, SetupArgs = Record<string, unknown>> {
  setup: (args?: SetupArgs) => Promise<T>
  teardown: () => Promise<void>
}
