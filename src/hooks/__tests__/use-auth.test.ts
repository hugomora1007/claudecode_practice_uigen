import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-id" });
});

afterEach(() => {
  cleanup();
});

test("initial isLoading state is false", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);
});

test("signIn sets isLoading true while pending and false when finished", async () => {
  let resolveSignIn: (value: any) => void;
  (signInAction as ReturnType<typeof vi.fn>).mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    })
  );

  const { result } = renderHook(() => useAuth());

  let signInPromise: Promise<any>;
  act(() => {
    signInPromise = result.current.signIn("user@example.com", "password123");
  });

  await waitFor(() => expect(result.current.isLoading).toBe(true));

  await act(async () => {
    resolveSignIn!({ success: true });
    await signInPromise;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn redirects to a new project built from anonymous work on success", async () => {
  (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
    messages: [{ role: "user", content: "hi" }],
    fileSystemData: { "/": {} },
  });
  (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "user", content: "hi" }],
      data: { "/": {} },
    })
  );
  expect(clearAnonWork).toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/anon-project-id");
  expect(getProjects).not.toHaveBeenCalled();
});

test("signIn redirects to the most recent existing project when there is no anonymous work", async () => {
  (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: "existing-project-1" },
    { id: "existing-project-2" },
  ]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProject).not.toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/existing-project-1");
});

test("signIn creates a brand new project when there is no anon work and no existing projects", async () => {
  (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "brand-new-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(pushMock).toHaveBeenCalledWith("/brand-new-id");
});

test("signIn treats anon work with an empty messages array as no anonymous work", async () => {
  (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
    messages: [],
    fileSystemData: {},
  });
  (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-project" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(clearAnonWork).not.toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/existing-project");
});

test("signIn does not navigate or touch projects when credentials are rejected", async () => {
  (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: false,
    error: "Invalid credentials",
  });

  const { result } = renderHook(() => useAuth());

  let response: any;
  await act(async () => {
    response = await result.current.signIn("user@example.com", "wrong-password");
  });

  expect(response).toEqual({ success: false, error: "Invalid credentials" });
  expect(getAnonWorkData).not.toHaveBeenCalled();
  expect(getProjects).not.toHaveBeenCalled();
  expect(createProject).not.toHaveBeenCalled();
  expect(pushMock).not.toHaveBeenCalled();
});

test("signIn resets isLoading even when the action throws", async () => {
  (signInAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

  const { result } = renderHook(() => useAuth());

  await expect(
    act(async () => {
      await result.current.signIn("user@example.com", "password123");
    })
  ).rejects.toThrow("network error");

  expect(result.current.isLoading).toBe(false);
});

test("signUp redirects using anonymous work on success", async () => {
  (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/": {} },
  });
  (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "signup-anon-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "password123");
  });

  expect(clearAnonWork).toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/signup-anon-id");
});

test("signUp does not navigate when sign up fails", async () => {
  (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: false,
    error: "Email already registered",
  });

  const { result } = renderHook(() => useAuth());

  let response: any;
  await act(async () => {
    response = await result.current.signUp("new@example.com", "password123");
  });

  expect(response).toEqual({ success: false, error: "Email already registered" });
  expect(pushMock).not.toHaveBeenCalled();
});

test("signUp sets isLoading true while pending and false when finished", async () => {
  let resolveSignUp: (value: any) => void;
  (signUpAction as ReturnType<typeof vi.fn>).mockReturnValue(
    new Promise((resolve) => {
      resolveSignUp = resolve;
    })
  );

  const { result } = renderHook(() => useAuth());

  let signUpPromise: Promise<any>;
  act(() => {
    signUpPromise = result.current.signUp("new@example.com", "password123");
  });

  await waitFor(() => expect(result.current.isLoading).toBe(true));

  await act(async () => {
    resolveSignUp!({ success: true });
    await signUpPromise;
  });

  expect(result.current.isLoading).toBe(false);
});
