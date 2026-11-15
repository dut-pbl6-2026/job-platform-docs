import { expect, Page, test } from "@playwright/test";
import { API, loginViaUi, PASSWORD, registerUser, uniqueEmail } from "./helpers";

// Panel là <section class="jp-panel"> với tiêu đề <h2>.
const panel = (page: Page, title: string) =>
  page.locator("section.jp-panel", { has: page.getByRole("heading", { name: title, exact: true }) });

test.describe("PROFILE-01 Hồ sơ cá nhân (UI)", () => {
  test.describe.configure({ mode: "serial" });
  let email: string;

  test.beforeAll(async ({ request }) => {
    email = uniqueEmail("prof");
    await registerUser(request, email, "Profile Tester");
  });

  test("PROF-UI-01 Chưa đăng nhập vào /profile → chuyển về /login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe("đã đăng nhập", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUi(page, email);
      await expect(page).toHaveURL(/\/jobs/);
      await page.goto("/profile");
      await expect(page.getByRole("heading", { name: "Hồ sơ của tôi", exact: true })).toBeVisible();
    });

    test("PROF-UI-02 Hồ sơ mới hiển thị họ tên mặc định và trạng thái trống", async ({ page }) => {
      await expect(page.locator(".jp-kv dd").first()).toHaveText("Profile Tester");
      await expect(page.locator(".jp-kv dd").nth(1)).toHaveText("Chưa cập nhật");
      await expect(page.getByText("Chưa có kỹ năng nào.")).toBeVisible();
    });

    test("PROF-UI-03 Sửa thông tin hợp lệ → thông báo 'Đã lưu hồ sơ' và hiển thị giá trị mới", async ({ page }) => {
      await page.getByRole("button", { name: "Sửa thông tin" }).click();
      await page.locator("#profile-name").fill("Nguyen Van A");
      await page.locator("#profile-headline").fill("Backend Developer");
      await page.locator("#profile-phone").fill("0901234567");
      await page.locator("#profile-address").fill("Da Nang");
      await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
      await expect(page.getByText("Đã lưu hồ sơ.")).toBeVisible();
      await expect(page.locator(".jp-kv dd").first()).toHaveText("Nguyen Van A");
      await expect(page.locator(".jp-kv dd").nth(1)).toHaveText("Backend Developer");
      await expect(page.locator(".jp-kv dd").nth(2)).toHaveText("0901234567");
    });

    test("PROF-UI-04 Họ tên quá ngắn → báo lỗi, không lưu", async ({ page }) => {
      await page.getByRole("button", { name: "Sửa thông tin" }).click();
      await page.locator("#profile-name").fill("A");
      await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
      await expect(page.getByText("Họ tên cần từ 2 ký tự.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Lưu hồ sơ" })).toBeVisible();
    });

    test("PROF-UI-05 Thêm kỹ năng → hiện chip, xóa → biến mất", async ({ page }) => {
      const section = panel(page, "Kỹ năng");
      await section.getByRole("button", { name: "Thêm" }).click();
      await page.locator("#skill-name").fill("C#");
      await page.locator("#skill-level").selectOption("4");
      await page.locator("#skill-years").fill("3");
      await page.getByRole("button", { name: "Lưu kỹ năng" }).click();
      const item = section.locator(".jp-item", { hasText: "C#" });
      await expect(item).toContainText("Mức 4/5 · 3 năm");
      await item.getByRole("button", { name: "Xóa kỹ năng C#" }).click();
      await expect(section.locator(".jp-item", { hasText: "C#" })).toHaveCount(0);
    });

    test("PROF-UI-06 Thêm kỹ năng thiếu tên → báo lỗi", async ({ page }) => {
      const section = panel(page, "Kỹ năng");
      await section.getByRole("button", { name: "Thêm" }).click();
      await page.getByRole("button", { name: "Lưu kỹ năng" }).click();
      await expect(page.getByText("Nhập tên kỹ năng.")).toBeVisible();
    });

    test("PROF-UI-07 Thêm kinh nghiệm làm việc", async ({ page }) => {
      const section = panel(page, "Kinh nghiệm làm việc");
      await section.getByRole("button", { name: "Thêm" }).click();
      await page.locator("#exp-company").fill("Enfue");
      await page.locator("#exp-title").fill("Backend Developer");
      await page.locator("#exp-start").fill("2024-01-01");
      await page.getByLabel("Đang làm việc ở đây").check();
      await page.getByRole("button", { name: "Lưu kinh nghiệm" }).click();
      await expect(section.getByText("Enfue")).toBeVisible();
    });

    test("PROF-UI-08 Thêm học vấn", async ({ page }) => {
      const section = panel(page, "Học vấn");
      await section.getByRole("button", { name: "Thêm" }).click();
      await page.locator("#edu-school").fill("DUT");
      await page.locator("#edu-degree").fill("Cử nhân");
      await page.locator("#edu-field").fill("Kỹ thuật phần mềm");
      await page.locator("#edu-start").fill("2021-09-01");
      await page.getByRole("button", { name: "Lưu học vấn" }).click();
      await expect(section.getByText("Cử nhân · Kỹ thuật phần mềm")).toBeVisible();
      await expect(section.getByText(/DUT/)).toBeVisible();
    });

    test("PROF-UI-09 Dữ liệu sửa trên UI phải được lưu ở backend", async ({ page, request }) => {
      await page.getByRole("button", { name: "Sửa thông tin" }).click();
      await page.locator("#profile-headline").fill("Persisted Headline");
      await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
      await expect(page.getByText("Đã lưu hồ sơ.")).toBeVisible();

      const login = await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } });
      const { accessToken } = await login.json();
      const res = await request.get(`${API}/api/profiles/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
      expect(res.status()).toBe(200);
      expect((await res.json()).headline).toBe("Persisted Headline");
    });

    test("PROF-UI-10 Thêm học vấn thiếu ngành → báo lỗi", async ({ page }) => {
      const section = panel(page, "Học vấn");
      await section.getByRole("button", { name: "Thêm" }).click();
      await page.locator("#edu-school").fill("DUT");
      await page.getByRole("button", { name: "Lưu học vấn" }).click();
      await expect(page.getByText("Nhập ngành học.")).toBeVisible();
    });
  });
});
