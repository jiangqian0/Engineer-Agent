"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Paperclip, Puzzle, ChevronDown, Loader2, Brain, Bot, Check, AlertCircle, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MemoryPanel } from "@/components/chat/memory-panel";
import { CodeBlock } from "@/components/chat/code-block";

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

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamedContent, setStreamedContent] = React.useState("");
  const [showStreamingContainer, setShowStreamingContainer] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = React.useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = React.useState(true);

  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [steps, setSteps] = React.useState<Step[]>([
    { id: "1", title: "Understanding Intent", status: "pending" },
    { id: "2", title: "Selecting Agent", status: "pending" },
    { id: "3", title: "Processing Request", status: "pending" },
    { id: "4", title: "Generating Response", status: "pending" },
  ]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const streamingContentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent]);

  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conversation");
    if (convId) {
      loadConversation(convId);
    }
  }, []);

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setCurrentConversationId(convId);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

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

  const renderMessageContent = (content: string) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({node, className, children, ...props}: any) {
          const match = /language-(\w+)/.exec(className || '');
          const isInlineCode = !match && !className;

          if (isInlineCode) {
            return (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }

          return (
            <CodeBlock
              code={String(children).replace(/\n$/, '')}
              language={match ? match[1] : ''}
              className="my-3"
            />
          );
        },
        p({children}) {
          return <p className="whitespace-pre-wrap leading-relaxed mb-2 last:mb-0">{children}</p>;
        },
        h1({children}) {
          return <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>;
        },
        h2({children}) {
          return <h2 className="text-xl font-semibold mt-3 mb-2">{children}</h2>;
        },
        h3({children}) {
          return <h3 className="text-lg font-semibold mt-3 mb-1">{children}</h3>;
        },
        ul({children}) {
          return <ul className="list-disc ml-4 space-y-1">{children}</ul>;
        },
        ol({children}) {
          return <ol className="list-decimal ml-4 space-y-1">{children}</ol>;
        },
        li({children}) {
          return <li className="ml-4">{children}</li>;
        },
        strong({children}) {
          return <strong className="font-semibold">{children}</strong>;
        },
        em({children}) {
          return <em className="italic">{children}</em>;
        },
        blockquote({children}) {
          return <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">{children}</blockquote>;
        },
        table({children}) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                {children}
              </table>
            </div>
          );
        },
        thead({children}) {
          return <thead className="bg-gray-50">{children}</thead>;
        },
        tbody({children}) {
          return <tbody className="divide-y divide-gray-200">{children}</tbody>;
        },
        tr({children}) {
          return <tr className="hover:bg-gray-50">{children}</tr>;
        },
        th({children}) {
          return <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">{children}</th>;
        },
        td({children}) {
          return <td className="px-4 py-2 text-sm text-gray-900 border-r border-gray-100 last:border-r-0">{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

  const renderMarkdownToHtml = (content: string): string => {
    let result = content;

    result = result.replace(/\[THINKING\]([\s\S]*?)\[\/THINKING\]/g, (match, thinking) => {
      return `<div class="thinking-block"><div class="thinking-header">🤔 Thinking...</div><div class="thinking-content">${thinking.trim()}</div></div>`;
    });

    result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="bg-gray-100 rounded p-3 my-2 overflow-x-auto"><code class="text-sm">${escapeHtml(code.trim())}</code></pre>`;
    });

    result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

    result = result.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-3 mb-1">$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

    result = result.replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    result = result.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

    result = result.replace(/\n/g, '<br/>');

    return result;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    setError(null);
    setStreamedContent("");
    setShowStreamingContainer(true);
    resetExecutionState();

    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    updateStep("1", "running");
    addLog("info", "Processing user request...");

    await new Promise(r => setTimeout(r, 300));
    updateStep("1", "completed");
    updateStep("2", "running");
    addLog("info", "Selecting appropriate agent...");

    await new Promise(r => setTimeout(r, 300));
    updateStep("2", "completed");
    updateStep("3", "running");
    addLog("info", "Sending request to AI model...");

    try {
      const res = await fetch("/api/chat/stream", {
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

      updateStep("3", "completed");
      updateStep("4", "running");
      addLog("success", "Response stream started");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let parseErrorCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              break;
            }
            try {
              const json = JSON.parse(data);
              if (json.error) {
                throw new Error(json.error);
              }
              if (json.done) {
                if (json.conversation_id && !currentConversationId) {
                  setCurrentConversationId(json.conversation_id);
                  window.history.replaceState(null, "", `/chat?conversation=${json.conversation_id}`);
                }
              } else if (json.token) {
                fullResponse += json.token;
                if (streamingContentRef.current) {
                  streamingContentRef.current.innerHTML = renderMarkdownToHtml(fullResponse);
                  streamingContentRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
                }
              }
            } catch (e) {
              parseErrorCount++;
              if (parseErrorCount <= 3) {
                console.error("Parse error:", e, "Data:", data);
              }
              if (parseErrorCount > 10) {
                throw new Error("Too many parse errors. Check console for details.");
              }
            }
          }
        }
      }

      if (streamingContentRef.current) {
        streamingContentRef.current.innerHTML = renderMarkdownToHtml(fullResponse);
      }

      const assistantMessage: Message = { role: "assistant", content: fullResponse };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamedContent("");
      setShowStreamingContainer(false);

      updateStep("4", "completed");
      addLog("success", "Task completed successfully");

    } catch (err: any) {
      setError(err.message || "Failed to send message");
      addLog("error", err.message || "Request failed");
      updateStep("3", "error");
      setMessages(prev => prev.slice(0, -1));
      setShowStreamingContainer(false);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStepIcon = (status: Step["status"]) => {
    switch (status) {
      case "completed":
        return <Check className="w-3 h-3 text-white" />;
      case "running":
        return <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-white" />;
      default:
        return null;
    }
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return <Activity className="w-3 h-3 text-blue-500" />;
      case "success":
        return <Check className="w-3 h-3 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-3 h-3 text-amber-500" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b border-manulife-lightGrey bg-manulife-lightGreyBg">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-manulife-green" />
            <h1 className="font-semibold text-gray-900">Agent Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showExecutionPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowExecutionPanel(!showExecutionPanel)}
              className={showExecutionPanel ? "bg-manulife-green" : ""}
            >
              <Activity className="w-4 h-4 mr-1" />
              Execution
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMemoryPanel(true)}
              className="gap-2"
            >
              <Brain className="w-4 h-4" />
              Memory
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-none mx-auto space-y-6">
            {messages.length === 0 && !streamedContent ? (
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
                        "inline-block p-4 rounded-lg text-sm",
                        msg.role === "user"
                          ? "bg-manulife-green text-white"
                          : "bg-manulife-lightGreyBg text-gray-900"
                      )}>
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  </div>
                ))}

                {showStreamingContainer && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-manulife-lightGrey">
                      <Bot className="w-5 h-5 text-manulife-green" />
                    </div>
                    <div className="flex-1 max-w-3xl">
                      <div className="inline-block p-4 rounded-lg bg-manulife-lightGreyBg text-gray-900 max-w-none">
                        <div
                          ref={streamingContentRef}
                          className="markdown-content"
                        />
                        <span className="inline-block w-2 h-4 bg-manulife-green ml-1 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-manulife-lightGrey">
          <div className="max-w-none mx-auto">
            <div className="flex gap-3 mb-3 flex-wrap">
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

            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? "等待回复中..." : "输入你的请求..."}
                disabled={isStreaming}
                className="w-full resize-none border-manulife-lightGrey focus:border-manulife-green focus:ring-1 focus:ring-manulife-green py-3 px-4 pr-12"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isStreaming || !input.trim()}
                className="absolute right-2 bottom-2 bg-manulife-green hover:bg-manulife-green/90 text-white"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {showExecutionPanel && (
        <div className="w-80 border-l border-manulife-lightGrey bg-manulife-lightGreyBg flex flex-col">
          <div className="p-4 border-b border-manulife-lightGrey bg-white">
            <h2 className="font-semibold text-gray-900">Agent Execution</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-white border border-manulife-lightGrey p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Task Breakdown</h3>
              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded-full",
                        step.status === "completed"
                          ? "bg-manulife-green"
                          : step.status === "running"
                          ? "bg-amber-500"
                          : step.status === "error"
                          ? "bg-red-500"
                          : "bg-gray-200"
                      )}
                    >
                      {getStepIcon(step.status)}
                    </div>
                    <span className={cn(
                      "text-sm",
                      step.status === "pending" ? "text-gray-400" : "text-gray-700"
                    )}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-manulife-lightGrey p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Real-time Logs</h3>
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No logs yet</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <span className="text-gray-400 shrink-0">{log.timestamp}</span>
                        {getLogIcon(log.type)}
                        <span className={cn(
                          log.type === "error" && "text-red-600",
                          log.type === "success" && "text-green-600",
                          log.type === "warning" && "text-amber-600",
                          log.type === "info" && "text-gray-600"
                        )}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-medium text-red-700">Error</h3>
                </div>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <MemoryPanel isOpen={showMemoryPanel} onClose={() => setShowMemoryPanel(false)} conversationId={currentConversationId} />
    </div>
  );
}
