import { expect, test } from "@playwright/test";
import path from "node:path";
import { loginViaUi, registerUser, uniqueEmail } from "./helpers";

// Demo ghi hình một phiên trình duyệt thật (Playwright) đi qua toàn bộ tính năng AI
// (SCORE-01) và phần hồ sơ cá nhân. Dùng để làm minh chứng video cho báo cáo kiểm thử:
//   PW_VIDEO=on SCORE_JOB_ID=<uuid> npx playwright test tests/demo-record.spec.ts
// Video nằm trong test-results/<ten-test>/video.webm (đã bật video: "on").
const JOB_ID = process.env.SCORE_JOB_ID ?? "";
const fx = (name: string) => path.join(__dirname, "fixtures", name);
const pause = (page: import("@playwright/test").Page, ms = 700) => page.waitForTimeout(ms);

test.use({ video: "on", viewport: { width: 1280, height: 800 }, launchOptions: { slowMo: 350 } });

test.describe("DEMO ghi hình", () => {
  test.skip(!JOB_ID, "đặt SCORE_JOB_ID=<uuid job> để chạy");
  test.setTimeout(240_000);

  test("SCORE-01 + PROFILE-01 — phiên trình duyệt đầy đủ", async ({ page, request }) => {
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

    // 2) Từ trang chi tiết job mở trang chấm điểm CV
    await page.goto(`/jobs/${JOB_ID}`);
    await pause(page, 900);
    await page.getByRole("link", { name: /Kiểm tra độ phù hợp CV/ }).click();
    await expect(page.getByRole("heading", { name: /Kiểm tra độ phù hợp CV/ })).toBeVisible();
    await pause(page, 900);

    // 3) CV scan (PDF ảnh) → OCR, xem điểm và breakdown
    await page.locator('input[type="file"]').setInputFiles(fx("cv-scanned.pdf"));
    await pause(page, 700);
    await page.getByRole("button", { name: "Chấm điểm CV" }).click();
    await expect(page.getByRole("img", { name: /Điểm phù hợp \d+ trên 100/ })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("CV dạng ảnh, đọc bằng OCR")).toBeVisible();
    await pause(page, 1200);
    await page.getByRole("heading", { name: "Kỹ năng", exact: true }).scrollIntoViewIfNeeded();
    await pause(page, 1200);
    await page.getByRole("heading", { name: "Mức liên quan nội dung", exact: true }).scrollIntoViewIfNeeded();
    await pause(page, 1200);
    await page.getByRole("heading", { name: "Kinh nghiệm", exact: true }).scrollIntoViewIfNeeded();
    await pause(page, 900);
    await page.getByRole("heading", { name: "Học vấn", exact: true }).scrollIntoViewIfNeeded();
    await pause(page, 900);

    // 4) CV PDF có lớp chữ
    await page.goto(`/resume-score?jobId=${JOB_ID}`);
    await page.locator('input[type="file"]').setInputFiles(fx("cv-text.pdf"));
    await pause(page, 500);
    await page.getByRole("button", { name: "Chấm điểm CV" }).click();
    await expect(page.getByText("CV có lớp chữ")).toBeVisible({ timeout: 90_000 });
    await pause(page, 1200);

    // 5) CV DOCX
    await page.locator('input[type="file"]').setInputFiles(fx("cv.docx"));
    await pause(page, 400);
    await page.getByRole("button", { name: "Chấm điểm CV" }).click();
    await expect(page.getByText("CV dạng DOCX")).toBeVisible({ timeout: 90_000 });
    await pause(page, 900);

    // 6) PDF trống → lỗi đọc chữ
    await page.locator('input[type="file"]').setInputFiles(fx("blank.pdf"));
    await page.getByRole("button", { name: "Chấm điểm CV" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Không đọc được chữ" })).toBeVisible({ timeout: 60_000 });
    await pause(page, 1000);

    // 7) File .txt bị chặn ngay trên trình duyệt
    await page.locator('input[type="file"]').setInputFiles(fx("notes.txt"));
    await expect(page.getByText("Chỉ nhận PDF hoặc DOCX")).toBeVisible();
    await pause(page, 1000);

    // 8) Hồ sơ cá nhân: sửa thông tin + thêm kỹ năng
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
