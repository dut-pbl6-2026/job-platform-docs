import { expect, test } from "@playwright/test";
import path from "node:path";
import { API, loginViaUi, registerUser, uniqueEmail } from "./helpers";

// SCORE-01 Chấm điểm CV (UI). Yêu cầu: gateway :5000 có route /api/ai/*, ai-svc :6000, job-svc :5002.
// SCORE_JOB_ID = id (UUID) của một job có thật trong job-svc (nên là job Python/Backend để điểm có ý nghĩa).
const JOB_ID = process.env.SCORE_JOB_ID ?? "";
const fx = (name: string) => path.join(__dirname, "fixtures", name);
// Trang /resume-score dùng input file ẩn (không có id) — chọn theo type=file.
const cvInput = (page: import("@playwright/test").Page) => page.locator('input[type="file"]');

test.describe("SCORE-01 Chấm điểm CV (UI)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!JOB_ID, "đặt SCORE_JOB_ID=<uuid job> để chạy");
  let email: string;

  test.beforeAll(async ({ request }) => {
    email = uniqueEmail("score");
    await registerUser(request, email, "Score Tester");
  });

  test("RS-UI-01 Chưa đăng nhập vào /resume-score → chuyển về /login", async ({ page }) => {
    await page.goto(`/resume-score?jobId=${JOB_ID}`);
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe("đã đăng nhập", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUi(page, email);
      await expect(page).toHaveURL(/\/jobs/);
      await page.goto(`/resume-score?jobId=${JOB_ID}`);
      await expect(page.getByRole("heading", { name: /Kiểm tra độ phù hợp CV/ })).toBeVisible();
    });

    test("RS-UI-02 CV dạng ảnh (scan) → OCR, hiện điểm và các thẻ chi tiết", async ({ page }) => {
      await cvInput(page).setInputFiles(fx("cv-scanned.pdf"));
      await page.getByRole("button", { name: "Chấm điểm CV" }).click();
      await expect(page.getByRole("img", { name: /Điểm phù hợp \d+ trên 100/ })).toBeVisible({ timeout: 90_000 });
      await expect(page.getByText("CV dạng ảnh, đọc bằng OCR")).toBeVisible();
      for (const h of ["Kỹ năng", "Mức liên quan nội dung", "Kinh nghiệm", "Học vấn"]) {
        await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
      }
    });

    test("RS-UI-03 CV PDF có lớp chữ → điểm cao hơn ngưỡng 'chưa phù hợp' cho job Python", async ({ page }) => {
      await cvInput(page).setInputFiles(fx("cv-text.pdf"));
      await page.getByRole("button", { name: "Chấm điểm CV" }).click();
      const ring = page.getByRole("img", { name: /Điểm phù hợp \d+ trên 100/ });
      await expect(ring).toBeVisible({ timeout: 90_000 });
      await expect(page.getByText("CV có lớp chữ")).toBeVisible();
      const score = Number(/(\d+) trên/.exec((await ring.getAttribute("aria-label")) ?? "")?.[1]);
      expect(score).toBeGreaterThanOrEqual(35);
    });

    test("RS-UI-04 DOCX được chấp nhận", async ({ page }) => {
      await cvInput(page).setInputFiles(fx("cv.docx"));
      await page.getByRole("button", { name: "Chấm điểm CV" }).click();
      await expect(page.getByText("CV dạng DOCX")).toBeVisible({ timeout: 90_000 });
    });

    test("RS-UI-05 PDF trống → thông báo không đọc được chữ", async ({ page }) => {
      await cvInput(page).setInputFiles(fx("blank.pdf"));
      await page.getByRole("button", { name: "Chấm điểm CV" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "Không đọc được chữ" })).toBeVisible({ timeout: 60_000 });
    });

    test("RS-UI-06 File .txt bị chặn ngay ở trình duyệt (không gọi API)", async ({ page }) => {
      let called = false;
      page.on("request", (r) => { if (r.url().includes("/api/ai/score-resume")) called = true; });
      await cvInput(page).setInputFiles(fx("notes.txt"));
      await expect(page.getByText("Chỉ nhận PDF hoặc DOCX")).toBeVisible();
      expect(called).toBe(false);
    });

    test("RS-UI-07 Trang chi tiết job có nút 'Kiểm tra độ phù hợp CV' dẫn tới trang chấm điểm", async ({ page }) => {
      await page.goto(`/jobs/${JOB_ID}`);
      await page.getByRole("link", { name: /Kiểm tra độ phù hợp CV/ }).click();
      await expect(page).toHaveURL(new RegExp(`/resume-score\\?jobId=${JOB_ID}`));
    });
  });

  test("RS-API-01 Gọi thẳng gateway không có token → 401", async ({ request }) => {
    const res = await request.post(`${API}/api/ai/score-resume`, { multipart: { job_id: JOB_ID, cv_file: { name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") } } });
    expect(res.status()).toBe(401);
  });
});
