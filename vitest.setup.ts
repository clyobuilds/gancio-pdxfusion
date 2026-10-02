import { $fetchRaw as fetch } from 'nitro-test-utils/e2e'
async function waitForServer() {
  const start = Date.now()
  while (Date.now() - start < 20000) {
    try {
      const res = await fetch('/api/utils/ping')
      if (res.data === 'ready') return
    } catch (e) {
      console.error(e)
    }

    await new Promise(r => setTimeout(r, 300))
  }

  throw new Error('Server not ready')
}

await waitForServer()

export { }
