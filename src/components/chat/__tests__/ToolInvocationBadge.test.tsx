import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ToolInvocation } from "ai";
import {
  ToolInvocationBadge,
  getToolInvocationText,
} from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function makeToolInvocation(overrides: Partial<ToolInvocation>): ToolInvocation {
  return {
    toolCallId: "call_1",
    toolName: "str_replace_editor",
    args: {},
    state: "result",
    result: "Success",
    ...overrides,
  } as ToolInvocation;
}

test("getToolInvocationText: str_replace_editor create", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      args: { command: "create", path: "/components/Card.jsx" },
    })
  );
  expect(text).toBe("Creating Card.jsx");
});

test("getToolInvocationText: str_replace_editor str_replace", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      args: { command: "str_replace", path: "/components/Card.jsx" },
    })
  );
  expect(text).toBe("Editing Card.jsx");
});

test("getToolInvocationText: str_replace_editor insert", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      args: { command: "insert", path: "/components/Card.jsx" },
    })
  );
  expect(text).toBe("Editing Card.jsx");
});

test("getToolInvocationText: str_replace_editor view", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      args: { command: "view", path: "/components/Card.jsx" },
    })
  );
  expect(text).toBe("Viewing Card.jsx");
});

test("getToolInvocationText: str_replace_editor undo_edit", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      args: { command: "undo_edit", path: "/components/Card.jsx" },
    })
  );
  expect(text).toBe("Undoing edit in Card.jsx");
});

test("getToolInvocationText: file_manager rename", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      toolName: "file_manager",
      args: {
        command: "rename",
        path: "/components/Old.jsx",
        new_path: "/components/New.jsx",
      },
    })
  );
  expect(text).toBe("Renaming Old.jsx to New.jsx");
});

test("getToolInvocationText: file_manager delete", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      toolName: "file_manager",
      args: { command: "delete", path: "/components/Card.jsx" },
    })
  );
  expect(text).toBe("Deleting Card.jsx");
});

test("getToolInvocationText: unknown tool name falls back to raw name", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      toolName: "some_other_tool",
      args: {},
    })
  );
  expect(text).toBe("Running some_other_tool");
});

test("getToolInvocationText: missing args doesn't crash", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      toolName: "str_replace_editor",
      args: {},
    })
  );
  expect(text).toBe("Editing file");
});

test("getToolInvocationText: nested path shows only the file basename", () => {
  const text = getToolInvocationText(
    makeToolInvocation({
      args: { command: "create", path: "/components/ui/Button.tsx" },
    })
  );
  expect(text).toBe("Creating Button.tsx");
});

test("ToolInvocationBadge shows a green dot and no spinner when complete", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeToolInvocation({
        state: "result",
        result: "Success",
        args: { command: "create", path: "/components/Card.jsx" },
      })}
    />
  );

  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolInvocationBadge shows a spinner and no dot while in progress", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeToolInvocation({
        state: "call",
        args: { command: "create", path: "/components/Card.jsx" },
      })}
    />
  );

  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});
