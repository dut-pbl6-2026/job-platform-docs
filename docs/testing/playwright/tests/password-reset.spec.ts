import { expect, test } from "@playwright/test";
import { loginViaUi, PASSWORD, registerUser, resetTokenFromMail, uniqueEmail } from "./helpers";

const NEW_PASSWORD = "NewPassw0rd1";
const GENERIC = /Nếu email tồn tại|If email exists/i;

async function submitForgot(page: import("@playwright/test").Page, email: string) {
  await page.goto("/forgot-password");
  await page.locator("#forgot-email").fill(email);
  await page.getByRole("button", { name: "Gửi liên kết đặt lại" }).click();
}

test.describe("AUTH-01-07/08 Quên & đặt lại mật khẩu", () => {
  test.describe.configure({ mode: "serial" });
  let email: string;
  let token: string;

  test.beforeAll(async ({ request }) => {
    email = uniqueEmail("pwd");
    await registerUser(request, email);
  });

  test("PWD-UI-01 Gửi yêu cầu với email đã đăng ký → thông báo + email tới MailHog", async ({ page, request }) => {
    await submitForgot(page, email);
    await expect(page.getByRole("status")).toContainText(GENERIC);
    token = await resetTokenFromMail(request, email);
    expect(token.length).toBeGreaterThan(20);
  });

  test("PWD-UI-02 Email không tồn tại → cùng thông báo (chống dò email)", async ({ page }) => {
    await submitForgot(page, uniqueEmail("nobody"));
    await expect(page.getByRole("status")).toContainText(GENERIC);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("PWD-UI-03 Email sai định dạng → báo lỗi, không gọi API", async ({ page }) => {
    let called = false;
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/forgot-password")) called = true; });
    await submitForgot(page, "not-an-email");
    await expect(page.getByRole("alert")).toHaveText("Email không hợp lệ");
    expect(called).toBe(false);
  });

  test("PWD-UI-04 Mật khẩu mới yếu → báo lỗi", async ({ page }) => {
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await page.locator("#reset-pwd").fill("weakpass");
    await page.locator("#reset-confirm").fill("weakpass");
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    await expect(page.getByRole("alert")).toHaveText("Mật khẩu 8+ ký tự, 1 chữ hoa, 1 số");
  });

  test("PWD-UI-05 Xác nhận mật khẩu không khớp → báo lỗi", async ({ page }) => {
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await page.locator("#reset-pwd").fill(NEW_PASSWORD);
    await page.locator("#reset-confirm").fill("Different1Pass");
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    await expect(page.getByRole("alert")).toHaveText("Xác nhận mật khẩu không khớp");
  });

  test("PWD-UI-06 Luồng đầy đủ: mở link trong email → đặt mật khẩu mới → về trang đăng nhập", async ({ page }) => {
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await expect(page.locator("#reset-token")).toHaveValue(token);   // token tự điền từ link
    await page.locator("#reset-pwd").fill(NEW_PASSWORD);
    await page.locator("#reset-confirm").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    await expect(page.getByRole("status")).toContainText(/thành công|successful/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("PWD-UI-07 Đăng nhập bằng mật khẩu mới thành công", async ({ page }) => {
    await loginViaUi(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/jobs/);
  });

  test("PWD-UI-08 Đăng nhập bằng mật khẩu cũ bị từ chối", async ({ page }) => {
    await loginViaUi(page, email, PASSWORD);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("PWD-UI-09 Link đã dùng rồi (one-time) → token không hợp lệ", async ({ page }) => {
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await page.locator("#reset-pwd").fill("AnotherPassw0rd2");
    await page.locator("#reset-confirm").fill("AnotherPassw0rd2");
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    await expect(page.getByRole("alert")).toContainText(/không hợp lệ hoặc đã hết hạn/);
  });

  test("PWD-UI-10 Token tự nhập sai → token không hợp lệ", async ({ page }) => {
    await page.goto("/reset-password");
    await page.locator("#reset-token").fill("totally-invalid-token");
    await page.locator("#reset-pwd").fill(NEW_PASSWORD);
    await page.locator("#reset-confirm").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    await expect(page.getByRole("alert")).toContainText(/không hợp lệ hoặc đã hết hạn/);
  });

  test("PWD-UI-11 Gửi quá 5 lần/giờ → UI báo gửi thất bại (429)", async ({ page }) => {
    // đã dùng 2 lần ở UI-01/02; gửi tiếp cho tới khi bị chặn
    await page.goto("/forgot-password");
    for (let i = 0; i < 5; i++) {
      await page.locator("#forgot-email").fill(email);
      await page.getByRole("button", { name: "Gửi liên kết đặt lại" }).click();
      if (await page.getByRole("alert").isVisible({ timeout: 1500 }).catch(() => false)) break;
    }
    await expect(page.getByRole("alert")).toContainText("Gửi yêu cầu thất bại");
  });
});
