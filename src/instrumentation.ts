export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupWorkers } = await import('./lib/queue')
    setupWorkers()
  }
}
