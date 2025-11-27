import '@testing-library/jest-dom'
import 'whatwg-fetch' // Polyfill fetch for Jest
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local for tests
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// Polyfill ResizeObserver for Radix UI components (Tooltip, etc.)
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
