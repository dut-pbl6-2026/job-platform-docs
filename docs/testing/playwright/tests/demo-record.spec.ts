import { expect, test } from "@playwright/test";
import { registerUser, uniqueEmail } from "./helpers";

// Demo ghi hình một phiên trình duyệt thật (Playwright) đi qua phần hồ sơ cá nhân.
// Dùng để làm minh chứng video cho báo cáo kiểm thử:
//   PW_VIDEO=on npx playwright test tests/demo-record.spec.ts
// Video nằm trong test-results/<ten-test>/video.webm (đã bật video: "on").
// Trang chấm điểm CV dành cho ứng viên đã bị gỡ ngày 2026-11-16 (điểm phù hợp chỉ dành cho
// Nhà tuyển dụng/Quản trị viên), nên demo này không còn đi qua SCORE-01.
const pause = (page: import("@playwright/test").Page, ms = 700) => page.waitForTimeout(ms);

test.use({ video: "on", viewport: { width: 1280, height: 800 }, launchOptions: { slowMo: 350 } });

test.describe("DEMO ghi hình", () => {
  test.setTimeout(240_000);

  test("PROFILE-01 — phiên trình duyệt đầy đủ", async ({ page, request }) => {
    const email = uniqueEmail("demo");
    await registerUser(request, email, "Hoai Tester");

    // 1) Đăng nhập qua UI
    await page.goto("/login");
    await pause(page, 900);
    await page.locator("#login-email").fill(email);
    await page.locator("#login-pwd").fill("Passw0rdA");
    await pause(page, 500);
    await page.getByRole("button", { name: /^đăng nhập$/i }).click();
    await expect(page).toHaveURL(/\/jobs/);
    await pause(page, 900);

    // 2) Hồ sơ cá nhân: sửa thông tin + thêm kỹ năng
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi", exact: true })).toBeVisible();
    await pause(page, 700);
    await page.getByRole("button", { name: "Sửa thông tin" }).click();
    await page.locator("#profile-name").fill("Nguyen Van Hoai");
    await page.locator("#profile-headline").fill("Backend Developer");
    await page.locator("#profile-phone").fill("0901234567");
    await page.locator("#profile-address").fill("Da Nang");
    await pause(page, 600);
    await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
    await expect(page.getByText("Đã lưu hồ sơ.")).toBeVisible();
    await pause(page, 900);

    const skillPanel = page.locator("section.jp-panel", { has: page.getByRole("heading", { name: "Kỹ năng", exact: true }) });
    await skillPanel.getByRole("button", { name: "Thêm" }).click();
    await page.locator("#skill-name").fill("C#");
    await page.locator("#skill-level").selectOption("4");
    await page.locator("#skill-years").fill("3");
    await pause(page, 500);
    await page.getByRole("button", { name: "Lưu kỹ năng" }).click();
    await expect(skillPanel.locator(".jp-item", { hasText: "C#" })).toContainText("Mức 4/5 · 3 năm");
    await pause(page, 1200);
  });
});
