import { EventEmitter } from 'events'

class LogEventEmitter extends EventEmitter {
  emitLog(jobId: string, message: string, type: 'build' | 'boot' | 'download' = 'build') {
    this.emit(`log:${jobId}`, { message, type })
  }

  emitProgress(imageId: string, progress: number) {
    this.emit(`progress:${imageId}`, progress)
  }
}

// Global singleton
export const logEvents = new LogEventEmitter()
logEvents.setMaxListeners(100)
