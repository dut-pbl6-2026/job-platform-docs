import { APIRequestContext, expect, Page } from "@playwright/test";

export const API = process.env.API_URL ?? "http://localhost:5000";
export const MAILHOG = process.env.MAILHOG_URL ?? "http://localhost:8025";
export const PASSWORD = "Passw0rdA";

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@example.com`;
}

/** Tạo user qua API cho nhanh (phần Arrange, không phải đối tượng test). */
export async function registerUser(request: APIRequestContext, email: string, fullName = "E2E User") {
  const res = await request.post(`${API}/api/auth/register`, { data: { email, password: PASSWORD, fullName } });
  expect(res.ok(), `register ${email}`).toBeTruthy();
}

export async function loginViaUi(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-pwd").fill(password);
  await page.getByRole("button", { name: /^đăng nhập$/i }).click();
}

/** Lấy token reset từ email mới nhất gửi tới `email` trong MailHog. */
export async function resetTokenFromMail(request: APIRequestContext, email: string): Promise<string> {
  let token = "";
  await expect.poll(async () => {
    const res = await request.get(`${MAILHOG}/api/v2/search`, { params: { kind: "to", query: email } });
    const body = (await res.json()) as { items: { Content: { Body: string } }[] };
    const m = /reset-password\?token=([^\s"<]+)/.exec(body.items[0]?.Content.Body ?? "");
    token = m ? decodeURIComponent(m[1]) : "";
    return token;
  }, { timeout: 10_000, message: "email reset phải tới MailHog" }).not.toBe("");
  return token;
}
