import { defineConfig, devices } from '@playwright/test';

const localChromium = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: {
      executablePath: localChromium || undefined,
      // Headless Chromium has no GPU; ANGLE + SwiftShader gives real WebGL2 for screenshots.
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
