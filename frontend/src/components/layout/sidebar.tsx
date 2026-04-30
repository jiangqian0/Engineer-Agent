"use client";

import * as React from "react";
import { Plus, Code2, Zap, Server, Rocket, ShieldCheck, DollarSign, Puzzle, BookOpen, Bot, FileText, BarChart3, Clock, ChevronDown, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  {
    section: "Core Functions",
    items: [
      { id: "code", label: "Code Development", icon: Code2, href: "/code" },
      { id: "fc", label: "Function Compute", icon: Zap, href: "/fc" },
      { id: "resources", label: "Resource Management", icon: Server, href: "/resources" },
      { id: "deploy", label: "Deployment & Ops", icon: Rocket, href: "/deploy" },
    ],
  },
  {
    section: "Intelligent Agents",
    items: [
      { id: "security", label: "Security Governance", icon: ShieldCheck, href: "/security" },
      { id: "cost", label: "Cost Optimization", icon: DollarSign, href: "/cost" },
      { id: "create-agent", label: "Create Agent", icon: Plus, href: "/agents?create=true" },
    ],
  },
  {
    section: "Management Center",
    items: [
      { id: "skills", label: "Skill Center", icon: Puzzle, href: "/skills" },
      { id: "knowledge", label: "Knowledge Base", icon: BookOpen, href: "/knowledge" },
      { id: "agents", label: "Agent Center", icon: Bot, href: "/agents" },
    ],
  },
  {
    section: "Auxiliary Tools",
    items: [
      { id: "docs", label: "Documents & Reports", icon: FileText, href: "/docs" },
      { id: "monitor", label: "Monitoring Panel", icon: BarChart3, href: "/monitor" },
    ],
  },
];

const recentSessions = [
  { id: "1", title: "ECS Scaling Plan" },
  { id: "2", title: "Security Audit Report" },
  { id: "3", title: "Cost Analysis" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [historyExpanded, setHistoryExpanded] = React.useState(true);

  const isActive = (href: string) => {
    if (href === "/chat" && pathname === "/") return true;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full w-full flex-col bg-manulife-lightGreyBg">
      {/* Header Section */}
      <div className="bg-white border-b border-manulife-lightGrey">
        <div className="p-4 border-t-4 border-manulife-green">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-manulife-green flex items-center justify-center">
              <span className="text-white text-lg font-bold">AI</span>
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">Agent Hub</h2>
              <p className="text-xs text-manulife-grey">Enterprise Edition</p>
            </div>
          </div>
          <Button
            className="w-full justify-center gap-2 bg-manulife-green hover:bg-manulife-green/90 text-white font-medium"
            onClick={() => router.push("/chat")}
          >
            <Plus className="w-5 h-5" />
            <span>New Conversation</span>
          </Button>
        </div>
      </div>

      {/* Menu Section */}
      <div className="flex-1 overflow-y-auto">
        {menuItems.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {/* Section Header */}
            <div className="px-4 py-3 bg-white border-b border-manulife-lightGrey">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-manulife-green rounded-full"></div>
                <span className="text-xs font-bold text-manulife-green uppercase tracking-wider">
                  {section.section}
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1 bg-white border-b border-manulife-lightGrey">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150 border-l-4",
                      active
                        ? "bg-manulife-green/10 border-manulife-green text-manulife-green font-semibold"
                        : "border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 shrink-0",
                      active ? "text-manulife-green" : "text-gray-500"
                    )} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Recent Sessions Section */}
        <div className="mt-2 bg-white border-b border-manulife-lightGrey">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-manulife-green/60 rounded-full"></div>
              <span className="text-xs font-bold text-manulife-grey uppercase tracking-wider">History</span>
            </div>
            {historyExpanded ? (
              <ChevronDown className="w-4 h-4 text-manulife-grey" />
            ) : (
              <ChevronRight className="w-4 h-4 text-manulife-grey" />
            )}
          </button>

          {historyExpanded && (
            <div className="pb-2">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{session.title}</span>
                </button>
              ))}
              <button className="w-full text-left px-4 py-2.5 text-sm text-manulife-green hover:bg-gray-50 font-medium flex items-center gap-3">
                <ChevronRight className="w-4 h-4" />
                View All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 bg-white border-t-2 border-manulife-green">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-manulife-green to-manulife-green/70 flex items-center justify-center">
            <span className="text-white font-bold text-lg">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">User Name</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-manulife-green rounded-full animate-pulse"></span>
              <span className="text-xs text-manulife-green font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
