import { defineConfig, devices } from "@playwright/test";

// Web (nginx build) :5173 gọi thẳng Gateway :5000. MailHog :8025 nhận email reset.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,               // forgot-password bị rate-limit 5 request/IP/giờ → chạy tuần tự
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { open: "never" }], ["junit", { outputFile: "reports/junit.xml" }]],
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:5173",
    trace: "on",
    screenshot: "on",
    video: process.env.PW_VIDEO === "on" ? "on" : "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // PBL6-68: đa trình duyệt. "webkit" là engine WebKit của Playwright, KHÔNG phải Safari thật.
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // PBL6-68: giả lập thiết bị (viewport/UA/touch). KHÔNG phải phần cứng thật (Android 12+ / iOS 16+).
    // "Pixel 5" chạy engine Chromium; "iPhone 13" chạy engine WebKit.
    { name: "mobile-pixel-5", use: { ...devices["Pixel 5"] } },
    { name: "mobile-iphone-13", use: { ...devices["iPhone 13"] } },
  ],
});
