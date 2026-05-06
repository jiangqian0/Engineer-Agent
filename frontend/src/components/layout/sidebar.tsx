"use client";

import * as React from "react";
import { Plus, Code2, Zap, Server, Rocket, ShieldCheck, DollarSign, Puzzle, BookOpen, Bot, FileText, BarChart3, Clock, ChevronDown, ChevronRight, Settings, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [historyExpanded, setHistoryExpanded] = React.useState(true);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === "/chat" && pathname === "/") return true;
    return pathname.startsWith(href);
  };

  React.useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    };
    fetchConversations();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const handleConversationClick = (convId: string) => {
    router.push(`/chat?conversation=${convId}`);
  };

  const handleRename = async (convId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle.trim() })
      });

      if (res.ok) {
        setConversations(prev =>
          prev.map(c => c.id === convId ? { ...c, title: editingTitle.trim() } : c)
        );
      }
    } catch (error) {
      console.error("Failed to rename conversation:", error);
    }

    setEditingId(null);
    setEditingTitle("");
  };

  const handleDelete = async (convId: string) => {
    if (!confirm("Delete this conversation?")) return;

    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (pathname.includes(convId)) {
          router.push("/chat");
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const startDelete = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleDelete(convId);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingTitle("");
  };

  const confirmEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleRename(editingId!);
  };

  return (
    <div className="w-64 h-full bg-white flex flex-col border-r border-manulife-lightGrey">
      {/* Logo Section */}
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
              {conversations.length === 0 ? (
                <p className="px-4 py-2.5 text-sm text-gray-400">No conversations yet</p>
              ) : (
                conversations.slice(0, 10).map((conv) => (
                  <div
                    key={conv.id}
                    className="group relative"
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {editingId === conv.id ? (
                      <div className="px-4 py-2 flex items-center gap-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(conv.id);
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditingTitle("");
                            }
                          }}
                        />
                        <button
                          onClick={(e) => confirmEditing(e)}
                          className="p-1 hover:bg-green-100 text-green-600"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => cancelEditing(e)}
                          className="p-1 hover:bg-red-100 text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConversationClick(conv.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{conv.title || "Untitled"}</p>
                          <p className="text-xs text-gray-400">{formatDate(conv.updated_at)}</p>
                        </div>
                        {hoveredId === conv.id && (
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => startEditing(conv, e)}
                              className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => startDelete(conv.id, e)}
                              className="p-1 hover:bg-red-100 text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
              {conversations.length > 10 && (
                <button className="w-full text-left px-4 py-2.5 text-sm text-manulife-green hover:bg-gray-50 font-medium flex items-center gap-3">
                  <ChevronRight className="w-4 h-4" />
                  View All ({conversations.length})
                </button>
              )}
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
