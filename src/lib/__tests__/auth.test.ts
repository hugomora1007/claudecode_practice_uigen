// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession } from "../auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("createSession sets an auth-token cookie", async () => {
  await createSession("user-1", "user@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
  const [name, token, options] = mockCookieStore.set.mock.calls[0];

  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(options).toMatchObject({
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession signs a JWT containing the userId and email", async () => {
  await createSession("user-1", "user@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { payload } = await jwtVerify(token as string, JWT_SECRET);

  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("user@example.com");
});

test("createSession expires the cookie and token about 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, token, options] = mockCookieStore.set.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(options.expires.getTime()).toBeGreaterThanOrEqual(
    before + sevenDaysMs - 1000
  );
  expect(options.expires.getTime()).toBeLessThanOrEqual(
    after + sevenDaysMs + 1000
  );

  const { payload } = await jwtVerify(token as string, JWT_SECRET);
  expect(payload.exp).toBeDefined();
  expect(payload.exp! * 1000).toBeGreaterThanOrEqual(before + sevenDaysMs - 5000);
  expect(payload.exp! * 1000).toBeLessThanOrEqual(after + sevenDaysMs + 5000);
});

test("createSession marks the cookie secure in production", async () => {
  vi.stubEnv("NODE_ENV", "production");

  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.secure).toBe(true);
});

test("createSession marks the cookie insecure outside production", async () => {
  vi.stubEnv("NODE_ENV", "development");

  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.secure).toBe(false);
});
