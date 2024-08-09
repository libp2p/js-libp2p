// exporting property of globalThis allows us to fail gracefully in browsers
// without WebTransport support
export default globalThis.WebTransport
