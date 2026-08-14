import { defineConfig, devices } from '@playwright/test'
import { env } from 'node:process'

const inCi = Boolean(env.CI)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: inCi,
  retries: inCi ? 2 : 0,
  workers: inCi ? 2 : undefined,
  reporter: inCi ? [['html', { open: 'never' }], ['line']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    colorScheme: 'dark',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
