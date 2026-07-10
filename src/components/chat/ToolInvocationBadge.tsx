"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

function getFileName(path?: string): string {
  if (!path) return "file";
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

export function getToolInvocationText(toolInvocation: ToolInvocation): string {
  const { toolName, args } = toolInvocation;
  const a = (args ?? {}) as Record<string, any>;

  if (toolName === "str_replace_editor") {
    const fileName = getFileName(a.path);
    switch (a.command) {
      case "view":
        return `Viewing ${fileName}`;
      case "create":
        return `Creating ${fileName}`;
      case "undo_edit":
        return `Undoing edit in ${fileName}`;
      case "str_replace":
      case "insert":
      default:
        return `Editing ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    const fileName = getFileName(a.path);
    switch (a.command) {
      case "rename":
        return `Renaming ${fileName} to ${getFileName(a.new_path)}`;
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return `Updating ${fileName}`;
    }
  }

  return `Running ${toolName}`;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isComplete = toolInvocation.state === "result" && toolInvocation.result;
  const text = getToolInvocationText(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{text}</span>
    </div>
  );
}
