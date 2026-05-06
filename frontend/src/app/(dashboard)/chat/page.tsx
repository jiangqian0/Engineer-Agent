"use client";

import * as React from "react";
import { Send, Paperclip, Puzzle, Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface LogEntry {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}

interface Step {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "error";
}

const knowledgeBases = [
  { id: "kb1", name: "Operation Manual" },
  { id: "kb2", name: "Security Standards" },
  { id: "kb3", name: "Architecture Docs" },
];

const skills = [
  { id: "sk1", name: "Resource Query" },
  { id: "sk2", name: "Cost Analysis" },
  { id: "sk3", name: "Report Generation" },
  { id: "sk4", name: "FC Function Call" },
];

export default function ChatPage() {
  const [input, setInput] = React.useState("");
  const [showKbDropdown, setShowKbDropdown] = React.useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = React.useState(false);
  const [selectedKb, setSelectedKb] = React.useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  
  // Real chat state
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, logs]);

  const addLog = (type: LogEntry["type"], message: string) => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs(prev => [...prev, { id: Date.now().toString(), type, message, timestamp }]);
  };

  const updateStep = (id: string, status: Step["status"]) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const resetExecutionState = () => {
    setLogs([]);
    setSteps([
      { id: "1", title: "Understanding Intent", status: "pending" },
      { id: "2", title: "Selecting Agent", status: "pending" },
      { id: "3", title: "Processing Request", status: "pending" },
      { id: "4", title: "Generating Response", status: "pending" },
    ]);
  };

  const toggleKb = (id: string) => {
    setSelectedKb(prev =>
      prev.includes(id) ? prev.filter(kb => kb !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(sk => sk !== id) : [...prev, sk]
    );
  };

  const getSelectedKbNames = () => {
    if (selectedKb.length === 0) return "Select Knowledge Base";
    if (selectedKb.length === 1) return knowledgeBases.find(kb => kb.id === selectedKb[0])?.name;
    return `${selectedKb.length} selected`;
  };

  const getSelectedSkillNames = () => {
    if (selectedSkills.length === 0) return "Auto Select Skills";
    if (selectedSkills.length === 1) return skills.find(sk => sk.id === selectedSkills[0])?.name;
    return `${selectedSkills.length} selected`;
  };

  const sendMessage = async () => {
    if (!input.trim() || isRunning) return;

    const userMessage = input.trim();
    setInput("");
    setIsRunning(true);
    setError(null);
    resetExecutionState();

    // Add user message
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    // Update steps
    updateStep("1", "running");
    addLog("info", "Processing user request...");
    
    await new Promise(r => setTimeout(r, 500));
    updateStep("1", "completed");
    updateStep("2", "running");
    addLog("info", "Selecting appropriate agent...");

    await new Promise(r => setTimeout(r, 500));
    updateStep("2", "completed");
    updateStep("3", "running");
    addLog("info", "Sending request to AI model...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: currentConversationId,
          knowledge_bases: selectedKb,
          skills: selectedSkills
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to get response");
      }

      const data = await res.json();
      
      updateStep("3", "completed");
      updateStep("4", "running");
      addLog("success", "Response received successfully");

      const assistantMessage: Message = { role: "assistant", content: data.message };
      setMessages(prev => [...prev, assistantMessage]);

      if (!currentConversationId) {
        setCurrentConversationId(data.conversation_id);
      }

      await new Promise(r => setTimeout(r, 300));
      updateStep("4", "completed");
      addLog("success", "Task completed");

    } catch (err: any) {
      setError(err.message || "Failed to send message");
      addLog("error", err.message || "Request failed");
      updateStep("3", "error");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-none mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-manulife-green flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">AI</span>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">AliCloud Agent Hub</h1>
                <p className="text-manulife-grey">Select actions or start conversation</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "flex gap-3",
                    msg.role === "user" && "flex-row-reverse"
                  )}>
                    <div className={cn(
                      "w-10 h-10 flex items-center justify-center shrink-0",
                      msg.role === "user" ? "bg-manulife-green" : "bg-manulife-lightGrey"
                    )}>
                      {msg.role === "user" ? (
                        <span className="text-white text-sm font-medium">U</span>
                      ) : (
                        <span className="text-manulife-green text-sm font-medium">AI</span>
                      )}
                    </div>
                    <div className={cn(
                      "flex-1 max-w-3xl",
                      msg.role === "user" && "text-right"
                    )}>
                      <div className={cn(
                        "inline-block p-4 rounded text-sm",
                        msg.role === "user"
                          ? "bg-manulife-green text-white"
                          : "bg-manulife-lightGreyBg text-gray-900"
                      )}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-manulife-lightGrey">
                      <Bot className="w-5 h-5 text-manulife-green" />
                    </div>
                    <div className="flex-1 max-w-3xl">
                      <div className="inline-block p-4 rounded bg-manulife-lightGreyBg">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-manulife-green rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-manulife-green rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-manulife-green rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-manulife-lightGrey">
          <div className="max-w-none mx-auto">
            <div className="flex gap-3 mb-3 flex-wrap">
              {/* Knowledge Base Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowKbDropdown(!showKbDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-manulife-lightGrey bg-white hover:bg-manulife-lightGreyBg text-manulife-grey"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{getSelectedKbNames()}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </button>

                {showKbDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowKbDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-manulife-lightGrey z-50 p-2">
                      {knowledgeBases.map((kb) => (
                        <div
                          key={kb.id}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-manulife-lightGreyBg cursor-pointer"
                          onClick={() => toggleKb(kb.id)}
                        >
                          <Checkbox
                            checked={selectedKb.includes(kb.id)}
                            onCheckedChange={() => toggleKb(kb.id)}
                          />
                          <span className="text-sm text-manulife-grey">{kb.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Skills Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSkillDropdown(!showSkillDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-manulife-lightGrey bg-white hover:bg-manulife-lightGreyBg text-manulife-grey"
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  <span>{getSelectedSkillNames()}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </button>

                {showSkillDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSkillDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-manulife-lightGrey z-50 p-2">
                      {skills.map((skill) => (
                        <div
                          key={skill.id}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-manulife-lightGreyBg cursor-pointer"
                          onClick={() => toggleSkill(skill.id)}
                        >
                          <Checkbox
                            checked={selectedSkills.includes(skill.id)}
                            onCheckedChange={() => toggleSkill(skill.id)}
                          />
                          <span className="text-sm text-manulife-grey">{skill.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRunning ? "等待回复中..." : "输入你的请求..."}
                disabled={isRunning}
                className="w-full resize-none border-manulife-lightGrey focus:border-manulife-green focus:ring-1 focus:ring-manulife-green py-3 px-4 pr-12"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isRunning || !input.trim()}
                className="absolute right-2 bottom-2 bg-manulife-green hover:bg-manulife-green/90 text-white"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Execution Panel */}
      <div className="w-80 border-l border-manulife-lightGrey bg-manulife-lightGreyBg flex flex-col">
        <div className="p-4 border-b border-manulife-lightGrey bg-white">
          <h2 className="font-semibold text-gray-900">Agent Execution</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Task Breakdown */}
          <div className="bg-white border border-manulife-lightGrey p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Task Breakdown</h3>
            <div className="space-y-2">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-4 h-4 flex items-center justify-center",
                      step.status === "completed"
                        ? "bg-manulife-green"
                        : step.status === "running"
                        ? "bg-amber-500 animate-pulse"
                        : step.status === "error"
                        ? "bg-red-500"
                        : "bg-manulife-lightGrey"
                    )}
                  >
                    {(step.status === "completed" || step.status === "running") && (
                      <Check className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      step.status === "completed"
                        ? "text-manulife-green"
                        : step.status === "running"
                        ? "text-amber-700"
                        : step.status === "error"
                        ? "text-red-700"
                        : "text-manulife-grey"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Logs */}
          <div className="bg-white border border-manulife-lightGrey p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Real-time Logs</h3>
            <div className="space-y-1.5 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-manulife-grey text-center py-4">
                  No logs yet. Start a conversation to see execution logs.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "flex items-start gap-2 py-1 px-2",
                      log.type === "info" && "bg-blue-50 border-l-2 border-blue-500",
                      log.type === "success" && "bg-green-50 border-l-2 border-green-500",
                      log.type === "warning" && "bg-yellow-50 border-l-2 border-yellow-500",
                      log.type === "error" && "bg-red-50 border-l-2 border-red-500"
                    )}
                  >
                    <span className="text-manulife-grey shrink-0">[{log.timestamp}]</span>
                    <span className={cn(
                      log.type === "info" && "text-blue-700",
                      log.type === "success" && "text-green-700",
                      log.type === "warning" && "text-yellow-700",
                      log.type === "error" && "text-red-700"
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 8V4H8" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <circle cx="8.5" cy="14.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />
      <path d="M8 12h8" />
    </svg>
  );
}
