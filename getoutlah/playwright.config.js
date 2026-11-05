import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const LOGGED_OUT_TESTS = ['onboarding.spec.js', 'openjio.spec.js']


export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: 'http://127.0.0.1:5174',

    trace: 'on-first-retry',

    headless: !!process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      testMatch: LOGGED_OUT_TESTS,
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      testMatch: LOGGED_OUT_TESTS,
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],


  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true',
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-getoutlah.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-getoutlah',
      VITE_FIREBASE_STORAGE_BUCKET: '',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '',
      VITE_FIREBASE_APP_ID: 'demo-app-id',
    },
  },
})
