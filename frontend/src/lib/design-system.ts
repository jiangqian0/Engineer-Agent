import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const designSystem = {
  colors: {
    manulife: {
      blue: "#002D62",
      green: "#00693C",
      "green-light": "#4E9C73",
      teal: "#005844",
    },
    semantic: {
      success: "#00693C",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
  },
  typography: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    headings: {
      h1: "text-3xl font-bold tracking-tight",
      h2: "text-2xl font-semibold tracking-tight",
      h3: "text-xl font-semibold",
      h4: "text-lg font-medium",
    },
    body: "text-sm leading-relaxed",
    caption: "text-xs text-muted-foreground",
  },
  spacing: {
    section: "64px",
    component: "24px",
    element: "16px",
    compact: "8px",
  },
  layout: {
    sidebar: {
      width: "280px",
      collapsed: "64px",
    },
    header: {
      height: "64px",
    },
  },
  animation: {
    transition: "transition-all duration-200 ease-in-out",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  },
} as const;
