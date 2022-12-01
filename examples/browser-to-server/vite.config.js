export default {
  build: {
    target: 'es2020'
  },
  optimizeDeps: {
    esbuildOptions: { target: 'es2020', supported: { bigint: true } }
  },
  server: {
    open: true
  }
}