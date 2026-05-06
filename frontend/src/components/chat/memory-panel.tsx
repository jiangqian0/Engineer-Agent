"use client";

import * as React from "react";
import { X, Brain, Trash2, Search, Download, Upload, Check, Filter, ChevronRight, MessageSquare, Clock, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Memory {
  id: string;
  content: string;
  description: string;
  type: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  confidence: number;
}

interface Conversation {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  has_memories: boolean;
}

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

type FilterType = "all" | "preference" | "knowledge" | "session";
type ViewMode = "list" | "conversations" | "conversation_memories";

export function MemoryPanel({ isOpen, onClose, conversationId }: MemoryPanelProps) {
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null);
  const [conversationMemories, setConversationMemories] = React.useState<Memory[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<FilterType>("all");
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [importingIds, setImportingIds] = React.useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = React.useState(false);
  const [memoryConfig, setMemoryConfig] = React.useState({
    token_threshold: 8000,
    message_count_threshold: 20,
    extract_interval: 5
  });

  React.useEffect(() => {
    if (isOpen) {
      fetchMemories();
      fetchConversations();
      fetchMemoryConfig();
    }
  }, [isOpen, conversationId]);

  const fetchMemoryConfig = async () => {
    try {
      const res = await fetch("/api/memory/config");
      if (res.ok) {
        const data = await res.json();
        setMemoryConfig(data);
      }
    } catch (error) {
      console.error("Failed to fetch memory config:", error);
    }
  };

  const saveMemoryConfig = async () => {
    try {
      const res = await fetch("/api/memory/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memoryConfig)
      });
      if (res.ok) {
        setShowSettings(false);
      }
    } catch (error) {
      console.error("Failed to save memory config:", error);
    }
  };

  const fetchMemories = async () => {
    setLoading(true);
    try {
      let url = "/api/memories";
      if (conversationId) {
        url += `?conversation_id=${conversationId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const convs = (data.conversations || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          message_count: c.messages?.length || 0,
          created_at: c.created_at,
          has_memories: c.messages?.length > 5
        }));
        setConversations(convs);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const fetchConversationMemories = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        const mems: Memory[] = (data.messages || []).slice(0, 10).map((m: any, idx: number) => ({
          id: `${convId}-${idx}`,
          content: m.content.substring(0, 300),
          description: m.content.substring(0, 50) + "...",
          type: m.role === "user" ? "preference" : "knowledge",
          created_at: m.timestamp || data.created_at,
          updated_at: m.timestamp || data.updated_at,
          tags: [m.role],
          confidence: 0.6
        }));
        setConversationMemories(mems);
      }
    } catch (error) {
      console.error("Failed to fetch conversation memories:", error);
    }
  };

  const filteredMemories = React.useMemo(() => {
    let result = memories;

    if (filterType !== "all") {
      result = result.filter(m => m.type === filterType);
    }

    if (searchQuery.trim()) {
      result = result.filter(
        m =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [memories, filterType, searchQuery]);

  const shortTermMemories = React.useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return filteredMemories.filter(m => new Date(m.created_at) > oneHourAgo);
  }, [filteredMemories]);

  const longTermMemories = React.useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return filteredMemories.filter(m => new Date(m.created_at) <= oneHourAgo);
  }, [filteredMemories]);

  const deleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to delete memory:", error);
    }
  };

  const deleteSelected = async () => {
    for (const id of selectedIds) {
      if (!id.includes("-")) {
        await deleteMemory(id);
      }
    }
    setSelectedIds(new Set());
  };

  const exportMemories = async (format: "json" | "markdown") => {
    try {
      const ids = selectedIds.size > 0 ? Array.from(selectedIds).join(",") : undefined;
      const res = await fetch(`/api/memories/export?format=${format}${ids ? `&ids=${ids}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        if (format === "json") {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `memories-export-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const blob = new Blob([data.content], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `memories-export-${Date.now()}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Failed to export memories:", error);
    }
  };

  const importFromConversation = async () => {
    const toImport = Array.from(importingIds);
    if (toImport.length === 0) return;

    try {
      const mems = conversationMemories.filter(m => importingIds.has(m.id));
      const res = await fetch("/api/memories/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { memories: mems.map(m => ({
            content: m.content,
            description: m.description,
            type: m.type,
            tags: m.tags,
            confidence: m.confidence
          }))},
          format: "json"
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Imported ${result.imported} memories`);
        fetchMemories();
      }
    } catch (error) {
      console.error("Failed to import memories:", error);
    }

    setImportingIds(new Set());
    setViewMode("conversations");
    setSelectedConversation(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleImportSelect = (id: string) => {
    setImportingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMemories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMemories.map(m => m.id)));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "preference", label: "Preferences" },
    { value: "knowledge", label: "Knowledge" },
    { value: "session", label: "Sessions" }
  ];

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv);
    setImportingIds(new Set());
    fetchConversationMemories(conv.id);
    setViewMode("conversation_memories");
  };

  const handleBackToConversations = () => {
    setViewMode("conversations");
    setSelectedConversation(null);
    setConversationMemories([]);
    setImportingIds(new Set());
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedConversation(null);
    setConversationMemories([]);
    setImportingIds(new Set());
  };

  const renderMemoryCard = (memory: Memory, isSelectable: boolean = true, isSelected: boolean = false, onToggle?: () => void) => (
    <div
      className={cn(
        "p-4 bg-manulife-lightGreyBg rounded-lg border transition-colors cursor-pointer",
        isSelectable && isSelected
          ? "border-manulife-green ring-1 ring-manulife-green"
          : "border-manulife-lightGrey hover:border-manulife-green/50"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "px-2 py-0.5 text-xs rounded",
            memory.type === "preference"
              ? "bg-blue-100 text-blue-700"
              : memory.type === "knowledge"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          )}>
            {memory.type}
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(memory.created_at)}
          </span>
        </div>
        {isSelectable && (
          <div
            className={cn(
              "w-5 h-5 border-2 rounded flex items-center justify-center",
              isSelected
                ? "bg-manulife-green border-manulife-green"
                : "border-gray-300"
            )}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-900 font-medium mb-1">
        {memory.description}
      </p>
      <p className="text-sm text-gray-600 line-clamp-3">
        {memory.content}
      </p>
      {memory.tags && memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {memory.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-manulife-lightGrey shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-manulife-lightGrey bg-manulife-lightGreyBg">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-manulife-green" />
          <h2 className="font-semibold text-gray-900">Memory Panel</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {viewMode === "list" && (
        <>
          <div className="p-4 border-b border-manulife-lightGrey space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex gap-1 flex-wrap">
                {filterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value)}
                    className={cn(
                      "px-2 py-1 text-xs rounded",
                      filterType === option.value
                        ? "bg-manulife-green text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <span className="text-sm text-blue-700">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportMemories("json")}>
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button size="sm" variant="destructive" onClick={deleteSelected}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : (
                <>
                  {shortTermMemories.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-medium text-gray-700">Short-term Memory</h3>
                        <span className="text-xs text-gray-400">({shortTermMemories.length})</span>
                      </div>
                      <div className="space-y-3">
                        {shortTermMemories.map(memory => renderMemoryCard(
                          memory,
                          true,
                          selectedIds.has(memory.id),
                          () => toggleSelect(memory.id)
                        ))}
                      </div>
                    </div>
                  )}

                  {longTermMemories.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-manulife-green" />
                        <h3 className="text-sm font-medium text-gray-700">Long-term Memory</h3>
                        <span className="text-xs text-gray-400">({longTermMemories.length})</span>
                      </div>
                      <div className="space-y-3">
                        {longTermMemories.map(memory => renderMemoryCard(
                          memory,
                          true,
                          selectedIds.has(memory.id),
                          () => toggleSelect(memory.id)
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredMemories.length === 0 && (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No memories found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start a conversation to create memories
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-manulife-lightGrey bg-manulife-lightGreyBg flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("conversations")}
            >
              <Upload className="w-4 h-4 mr-1" />
              Import from History
            </Button>
            <p className="text-xs text-gray-500 self-center">
              {memories.length} memory items
            </p>
          </div>
        </>
      )}

      {viewMode === "conversations" && (
        <>
          <div className="p-4 border-b border-manulife-lightGrey">
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="mb-2">
              ← Back to Memories
            </Button>
            <h3 className="font-medium text-gray-900">Select Conversation to Import</h3>
            <p className="text-xs text-gray-500 mt-1">
              Choose a past conversation to extract and import memories
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No conversations yet
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className="p-4 bg-manulife-lightGreyBg rounded-lg border border-manulife-lightGrey hover:border-manulife-green/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{conv.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {conv.message_count} messages
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(conv.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {viewMode === "conversation_memories" && selectedConversation && (
        <>
          <div className="p-4 border-b border-manulife-lightGrey">
            <Button variant="ghost" size="sm" onClick={handleBackToConversations} className="mb-2">
              ← Back to Conversations
            </Button>
            <h3 className="font-medium text-gray-900">{selectedConversation.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Select memories to import ({importingIds.size} selected)
            </p>
          </div>

          {importingIds.size > 0 && (
            <div className="p-3 bg-blue-50 border-b border-blue-100">
              <Button size="sm" onClick={importFromConversation} className="w-full bg-manulife-green hover:bg-manulife-green/90">
                Import {importingIds.size} Memories
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {conversationMemories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No memories in this conversation
                </div>
              ) : (
                conversationMemories.map(memory => (
                  <div key={memory.id}>
                    {renderMemoryCard(
                      memory,
                      true,
                      importingIds.has(memory.id),
                      () => toggleImportSelect(memory.id)
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Memory Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Token Threshold</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={memoryConfig.token_threshold}
                  onChange={(e) => setMemoryConfig(prev => ({
                    ...prev,
                    token_threshold: parseInt(e.target.value) || 8000
                  }))}
                  className="w-28"
                />
                <span className="text-sm text-gray-500">Token</span>
              </div>
              <p className="text-xs text-gray-400">
                Extract when new messages exceed this token count
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Extract Interval</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">Every</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={memoryConfig.extract_interval}
                  onChange={(e) => setMemoryConfig(prev => ({
                    ...prev,
                    extract_interval: parseInt(e.target.value) || 5
                  }))}
                  className="w-20"
                />
                <span className="text-sm">messages</span>
              </div>
              <p className="text-xs text-gray-400">
                Trigger extraction after this many new messages
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={saveMemoryConfig}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
