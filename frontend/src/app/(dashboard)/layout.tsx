"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = React.useState(260);
  const [isDragging, setIsDragging] = React.useState(false);
  const minWidth = 200;
  const maxWidth = 400;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, e.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex h-screen bg-manulife-lightGreyBg/50">
      {/* Sidebar with fixed width */}
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 flex flex-col">
        <Sidebar />
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "w-1 bg-transparent hover:bg-manulife-green/30 cursor-col-resize transition-colors",
          isDragging && "bg-manulife-green/40"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
