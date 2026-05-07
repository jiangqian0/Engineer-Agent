"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Paperclip, ChevronDown, Loader2, Brain, Bot, Check, AlertCircle, Clock, Activity, ChevronRight, ChevronDown as ChevronDownIcon, Puzzle, Square, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MemoryPanel } from "@/components/chat/memory-panel";
import { WorkspacePanel } from "@/components/chat/workspace-panel";
import { CodeBlock } from "@/components/chat/code-block";
import { useSearchParams } from "next/navigation";

// 思考内容组件 - 始终显示在消息之前
const ThinkingContent: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [content, isStreaming]);

  if (!content) return null;

  // 检查是否是简短的步骤提示（不包含换行且较短）
  const isShortStep = !content.includes('\n') && content.length < 100;

  if (isShortStep) {
    // 简短步骤：显示为内联提示
    return (
      <div className="my-2 flex items-center gap-2 text-sm text-blue-600">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>{content}</span>
      </div>
    );
  }

  // 长思考内容：显示为可折叠卡片
  return (
    <div className="my-3 rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-green-100/50 transition-colors duration-200"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
          <Brain className="w-3.5 h-3.5 text-green-600" />
        </div>
        <span className="text-sm font-semibold text-green-700">
          {isExpanded ? "Hide thinking" : `Show thinking (${content.length} chars)`}
        </span>
        <div className="ml-auto">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-green-500 transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-4 h-4 text-green-500 transition-transform duration-200" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div ref={contentRef} className="px-4 pb-4 border-t border-green-100">
          <div className="mt-3 text-sm text-green-800 whitespace-pre-wrap leading-relaxed">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 可复制的表格组件
const CopyableTable: React.FC<{ children: React.ReactNode; tableText: string }> = ({ children, tableText }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative group my-4">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 border shadow-sm"
        >
          {copied ? (
            <CheckCheck className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="overflow-x-auto select-text">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {children}
        </table>
      </div>
    </div>
  );
};

// 解析 markdown 表格为纯文本
const parseTableToText = (node: any): string => {
  let result = "";

  const processNode = (n: any) => {
    if (!n) return;

    if (n.type === "table") {
      // 处理表头
      if (n.children?.[0]) {
        const headerRow = n.children[0];
        const headers = headerRow.children
          ?.filter((cell: any) => cell.type === "tableCell")
          .map((cell: any) => {
            const text = extractText(cell);
            return text || "";
          }) || [];
        result += headers.join(" | ") + "\n";
        result += headers.map(() => "---").join(" | ") + "\n";

        // 处理数据行
        for (let i = 1; i < n.children.length; i++) {
          const row = n.children[i];
          const cells = row.children
            ?.filter((cell: any) => cell.type === "tableCell")
            .map((cell: any) => {
              const text = extractText(cell);
              return text || "";
            }) || [];
          result += cells.join(" | ") + "\n";
        }
      }
    }
  };

  const extractText = (node: any): string => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (node.text) return node.text;
    if (node.value) return node.value;
    if (node.children) {
      return node.children.map(extractText).join("");
    }
    return "";
  };

  processNode(node);
  return result.trim();
};

interface MessageWithThinkingProps {
  content: string;
  isStreaming?: boolean;
}

const MessageWithThinking: React.FC<MessageWithThinkingProps> = ({ content, isStreaming }) => {
  const thinkingRegex = /\[THINKING\]([\s\S]*?)\[\/THINKING\]/g;
  const parts: Array<{ type: "thinking" | "content"; content: string }> = [];

  let lastIndex = 0;
  let match;

  while ((match = thinkingRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "content", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "thinking", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "content", content: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "content", content });
  }

  // 检测 markdown 内容是否完整
  const isMarkdownComplete = (text: string): boolean => {
    if (!isStreaming) return true;

    // 检查未闭合的代码块
    const codeBlocks = (text.match(/```/g) || []).length;
    if (codeBlocks % 2 !== 0) return false;

    return true;
  };

  // 提取表格文本用于复制
  const extractTableText = (node: any): string => {
    const lines: string[] = [];

    if (node.type === "table") {
      // 处理表头
      if (node.children?.[0]) {
        const headerRow = node.children[0];
        const headers = headerRow.children
          ?.filter((cell: any) => cell.type === "tableCell")
          .map((cell: any) => {
            if (cell.children) {
              return cell.children.map((c: any) => c.text || "").join("");
            }
            return cell.text || "";
          }) || [];
        lines.push(headers.join(" | "));
        lines.push(headers.map(() => "---").join(" | "));

        // 处理数据行
        for (let i = 1; i < node.children.length; i++) {
          const row = node.children[i];
          if (row.children) {
            const cells = row.children
              .filter((cell: any) => cell.type === "tableCell")
              .map((cell: any) => {
                if (cell.children) {
                  return cell.children.map((c: any) => c.text || "").join("");
                }
                return cell.text || "";
              });
            lines.push(cells.join(" | "));
          }
        }
      }
    }

    return lines.join("\n");
  };

  // Markdown 组件配置
  const MarkdownComponents = {
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
    table({node, children, ...props}: any) {
      const tableText = extractTableText(node);
      return (
        <CopyableTable tableText={tableText}>
          {children}
        </CopyableTable>
      );
    },
    p({children}: any) {
      return <p className="whitespace-pre-wrap leading-relaxed mb-2 last:mb-0">{children}</p>;
    },
    h1({children}: any) {
      return <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>;
    },
    h2({children}: any) {
      return <h2 className="text-xl font-semibold mt-3 mb-2">{children}</h2>;
    },
    h3({children}: any) {
      return <h3 className="text-lg font-semibold mt-3 mb-1">{children}</h3>;
    },
    ul({children}: any) {
      return <ul className="list-disc ml-4 space-y-1">{children}</ul>;
    },
    ol({children}: any) {
      return <ol className="list-decimal ml-4 space-y-1">{children}</ol>;
    },
    li({children}: any) {
      return <li className="ml-4">{children}</li>;
    },
    strong({children}: any) {
      return <strong className="font-semibold">{children}</strong>;
    },
    em({children}: any) {
      return <em className="italic">{children}</em>;
    },
    blockquote({children}: any) {
      return <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">{children}</blockquote>;
    },
    th({children}: any) {
      return <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 select-text">{children}</th>;
    },
    td({children}: any) {
      return <td className="px-4 py-2 text-sm text-gray-900 border-r border-gray-100 last:border-r-0 select-text">{children}</td>;
    },
  };

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === "thinking") {
          return (
            <ThinkingContent
              key={index}
              content={part.content}
              isStreaming={isStreaming && index === parts.length - 1}
            />
          );
        }

        // 流式输出时，如果 markdown 不完整则显示原始文本
        if (isStreaming && !isMarkdownComplete(part.content)) {
          return (
            <div key={index} className="whitespace-pre-wrap leading-relaxed">
              {part.content}
            </div>
          );
        }

        return (
          <div key={index} className="markdown-body select-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {part.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
};

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

interface Skill {
  id: string;
  name: string;
  description: string;
  allowed_tools: string[];
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

export default function ChatPage() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");

  const [input, setInput] = React.useState("");
  const [showKbDropdown, setShowKbDropdown] = React.useState(false);
  const [selectedKb, setSelectedKb] = React.useState<string[]>([]);

  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);
  const [showSkillDropdown, setShowSkillDropdown] = React.useState(false);

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamedContent, setStreamedContent] = React.useState("");
  const [streamedThinking, setStreamedThinking] = React.useState("");  // 实时思考内容
  const [showStreamingContainer, setShowStreamingContainer] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = React.useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = React.useState(true);
  const [lastUserMessage, setLastUserMessage] = React.useState<string>("");
  const [currentToolCall, setCurrentToolCall] = React.useState<string | null>(null);  // 当前正在调用的工具
  const [toolExecutionStatus, setToolExecutionStatus] = React.useState<{
    tool: string;
    status: 'preparing' | 'executing' | 'writing' | 'complete' | 'done' | 'error';
    message: string;
    startTime: number;
    fileName?: string;
    progress?: number;
    written?: number;
    total?: number;
  } | null>(null);  // 工具执行详细状态
  const [thinkingSteps, setThinkingSteps] = React.useState<Array<{
    content: string;
    details?: string;
    result_summary?: string;
    timestamp: number;
  }>>([]);  // 思考步骤列表
  const [codeOutput, setCodeOutput] = React.useState<string>("");  // 当前代码输出
  const [showCodeBlock, setShowCodeBlock] = React.useState(false);  // 是否显示代码块
  const [codeBlockInfo, setCodeBlockInfo] = React.useState<{
    fileName: string;
    language: string;
    totalLines: number;
  } | null>(null);  // 代码块信息

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
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent]);

  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  React.useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [conversationId]);

  React.useEffect(() => {
    const loadSkills = async () => {
      try {
        const res = await fetch("/api/skills/list");
        if (res.ok) {
          const data = await res.json();
          setSkills(data.skills || []);
        }
      } catch (error) {
        console.error("Failed to load skills:", error);
      }
    };
    loadSkills();
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
    setCurrentToolCall(null);
    setToolExecutionStatus(null);
    setThinkingSteps([]);
    setCodeOutput("");
    setShowCodeBlock(false);
    setCodeBlockInfo(null);
  };

  const toggleKb = (id: string) => {
    setSelectedKb(prev =>
      prev.includes(id) ? prev.filter(kb => kb !== id) : [...prev, id]
    );
  };

  const getSelectedKbNames = () => {
    if (selectedKb.length === 0) return "Select Knowledge Base";
    if (selectedKb.length === 1) return knowledgeBases.find(kb => kb.id === selectedKb[0])?.name;
    return `${selectedKb.length} selected`;
  };

  const getSelectedSkillName = () => {
    if (!selectedSkill) return "Select Skill (Optional)";
    const skill = skills.find(s => s.id === selectedSkill);
    return skill ? skill.name : "Select Skill (Optional)";
  };

  const handleSelectSkill = (skillId: string | null) => {
    setSelectedSkill(skillId);
    setShowSkillDropdown(false);
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setShowStreamingContainer(false);
      setCurrentToolCall(null);  // 清除当前工具调用
      setToolExecutionStatus(null);  // 清除工具执行状态
      addLog("warning", "Response generation stopped by user");
    }
  };

  const retryMessage = (content: string) => {
    setInput(content);
    setLastUserMessage(content);
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.focus();
    }
  };

  const renderMessageContent = (content: string, isStreaming: boolean = false) => {
    return <MessageWithThinking content={content} isStreaming={isStreaming} />;
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
    setStreamedThinking("");  // 重置思考内容
    setShowStreamingContainer(true);
    resetExecutionState();
    setCurrentToolCall(null);
    setToolExecutionStatus(null);
    setThinkingSteps([]);
    setCodeOutput("");
    setShowCodeBlock(false);
    setCodeBlockInfo(null);

    abortControllerRef.current = new AbortController();

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
      // 使用 Next.js API 路由代理，避免 CORS 问题
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: currentConversationId,
          knowledge_bases: selectedKb,
          skill_id: selectedSkill,
          enable_tools: true  // 启用真正的 Agent 工具调用
        }),
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to get response");
      }

      updateStep("3", "completed");
      updateStep("4", "running");
      addLog("success", "Response stream started");

      if (!res.body) {
        throw new Error("Response body is null");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";  // 完整的AI响应（包含思考标记）
      let streamedText = "";  // 用于实时显示的正文内容
      let parseErrorCount = 0;
      let thinkingBuffer = "";  // 思考内容缓冲区
      let inThinking = false;  // 是否在思考块中
      let pendingThinking = "";  // 待处理的思考内容（可能被分割）
      setStreamedThinking("");
      setStreamedContent("");

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
              console.log("[Frontend] Received event:", json.type, json);
              if (json.error) {
                throw new Error(json.error);
              }
              if (json.done) {
                if (json.conversation_id && !currentConversationId) {
                  setCurrentConversationId(json.conversation_id);
                  window.history.replaceState(null, "", `/chat?conversation=${json.conversation_id}`);
                }
              }
              // 新的事件格式支持
              else if (json.type === "thinking") {
                thinkingBuffer = json.content;
                setStreamedThinking(thinkingBuffer);
              }
              else if (json.type === "token") {
                streamedText += json.content;
                setStreamedContent(streamedText);
                fullResponse += json.content;
              }
              else if (json.type === "tool_call") {
                console.log(`[Tool Call] ${json.tool}`);
                addLog("info", `Executing tool: ${json.tool}`);
                setCurrentToolCall(json.tool);  // 显示当前调用的工具
                setToolExecutionStatus({
                  tool: json.tool,
                  status: 'executing',
                  message: `正在调用 ${json.tool}...`,
                  startTime: Date.now()
                });
                setCodeOutput("");
                setShowCodeBlock(false);
              }
              else if (json.type === "tool_result") {
                const executionTime = toolExecutionStatus ? ((Date.now() - toolExecutionStatus.startTime) / 1000).toFixed(1) : '0';
                setCurrentToolCall(null);  // 清除当前工具调用
                if (json.success) {
                  addLog("success", `Tool completed: ${json.tool} (${executionTime}s)`);
                  setToolExecutionStatus(prev => prev ? { ...prev, status: 'done', message: `Tool completed (${executionTime}s)` } : null);
                } else {
                  addLog("error", `Tool failed: ${json.error}`);
                  setToolExecutionStatus(prev => prev ? { ...prev, status: 'error', message: `Tool failed: ${json.error}` } : null);
                }
              }
              // 处理工具执行状态更新
              else if (json.type === "status") {
                const statusContent = json.content;
                const toolName = json.tool || currentToolCall || '';
                const message = json.message || '';

                if (statusContent === "preparing") {
                  setToolExecutionStatus({
                    tool: toolName,
                    status: 'preparing',
                    message: message || `Preparing ${toolName}...`,
                    startTime: Date.now()
                  });
                }
                else if (statusContent === "executing") {
                  setToolExecutionStatus({
                    tool: toolName,
                    status: 'executing',
                    message: message || `Executing ${toolName}...`,
                    startTime: Date.now()
                  });
                }
                else if (statusContent === "writing") {
                  setToolExecutionStatus(prev => prev ? {
                    ...prev,
                    status: 'writing',
                    message: message || `Writing file${json.file_name ? ': ' + json.file_name : ''}...`,
                    fileName: json.file_name,
                    totalSize: json.total_size
                  } : null);
                  setShowCodeBlock(true);
                }
                else if (statusContent === "complete") {
                  const executionTime = toolExecutionStatus ? ((Date.now() - toolExecutionStatus.startTime) / 1000).toFixed(1) : '0';
                  setToolExecutionStatus(prev => prev ? { ...prev, status: 'complete', message: `${toolName} completed (${executionTime}s)` } : null);
                }
                else if (statusContent === "done") {
                  setToolExecutionStatus(prev => prev ? { ...prev, status: 'done' } : null);
                }
              }
              // 处理思考步骤
              else if (json.type === "thinking_step") {
                const step = {
                  content: json.content,
                  details: json.details,
                  result_summary: json.result_summary,
                  timestamp: Date.now()
                };
                setThinkingSteps(prev => [...prev.slice(-9), step]);  // 保留最近10条

                if (json.result_summary) {
                  addLog("success", json.content);
                } else {
                  addLog("info", json.content);
                }
              }
              // 处理代码输出（流式）
              else if (json.type === "code_output") {
                setCodeOutput(prev => prev + json.content);
                setToolExecutionStatus(prev => prev ? {
                  ...prev,
                  progress: json.progress,
                  written: json.written,
                  total: json.total
                } : null);
              }
              // 处理代码块开始
              else if (json.type === "code_block_start") {
                setShowCodeBlock(true);
                setCodeBlockInfo({
                  fileName: json.file_name,
                  language: json.language,
                  totalLines: 0
                });
                setCodeOutput("");
                addLog("info", `Creating file: ${json.file_path || json.file_name}`);
              }
              // 处理代码块结束
              else if (json.type === "code_block_end") {
                setCodeBlockInfo(prev => prev ? { ...prev, totalLines: json.total_lines } : null);
                addLog("success", `File created: ${json.file_name} (${json.total_lines} lines)`);
              }
              // 兼容旧格式
              else if (json.token !== undefined) {
                const token = json.token;

                // 检查是否包含思考开始标记
                if (token.includes("[THINKING]")) {
                  // 分割思考标记前后的内容
                  const parts = token.split("[THINKING]");
                  if (parts[0]) {
                    streamedText += parts[0];
                    setStreamedContent(streamedText);
                  }
                  pendingThinking = parts.slice(1).join("[THINKING]");
                  inThinking = true;

                  // 检查是否有结束标记在同一 token 中
                  if (pendingThinking.includes("[/THINKING]")) {
                    const endParts = pendingThinking.split("[/THINKING]");
                    thinkingBuffer += endParts[0];
                    setStreamedThinking(thinkingBuffer);
                    streamedText += endParts.slice(1).join("[/THINKING]");
                    setStreamedContent(streamedText);
                    thinkingBuffer = "";
                    pendingThinking = "";
                    inThinking = false;
                  }
                }
                // 检查是否包含思考结束标记
                else if (token.includes("[/THINKING]")) {
                  const parts = token.split("[/THINKING]");
                  thinkingBuffer += parts[0];
                  setStreamedThinking(thinkingBuffer);
                  streamedText += parts.slice(1).join("[/THINKING]");
                  setStreamedContent(streamedText);
                  thinkingBuffer = "";
                  inThinking = false;
                }
                // 在思考块中
                else if (inThinking) {
                  thinkingBuffer += token;
                  setStreamedThinking(thinkingBuffer);
                }
                // 普通内容
                else {
                  streamedText += token;
                  setStreamedContent(streamedText);
                }

                // 累加到完整响应
                fullResponse += token;
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

      const assistantMessage: Message = { role: "assistant", content: fullResponse };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamedContent("");
      setStreamedThinking("");  // 重置思考内容
      setShowStreamingContainer(false);

      updateStep("4", "completed");
      addLog("success", "Task completed successfully");

    } catch (err: any) {
      setError(err.message || "Failed to send message");
      addLog("error", err.message || "Request failed");
      updateStep("3", "error");
      setMessages(prev => prev.slice(0, -1));
      setStreamedThinking("");  // 重置思考内容
      setShowStreamingContainer(false);
      setCurrentToolCall(null);  // 清除当前工具调用
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
                  <div key={`${msg.timestamp || ''}-${idx}`} className={cn(
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
                      <div
                        className={cn(
                          "inline-block p-4 rounded-lg text-sm cursor-pointer transition-opacity",
                          msg.role === "user"
                            ? "bg-manulife-green text-white hover:opacity-90"
                            : "bg-manulife-lightGreyBg text-gray-900"
                        )}
                        onClick={() => msg.role === "user" && !isStreaming && retryMessage(msg.content)}
                        title={msg.role === "user" ? "Click to retry" : undefined}
                      >
                        {renderMessageContent(msg.content, false)}
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
                      {/* 实时思考内容 - 独立显示 */}
                      <ThinkingContent
                        content={streamedThinking}
                        isStreaming={isStreaming}
                      />
                      {/* 实时正文内容 */}
                      <div className="inline-block p-4 rounded-lg bg-manulife-lightGreyBg text-gray-900 max-w-none">
                        {streamedContent ? (
                          renderMessageContent(streamedContent, true)
                        ) : toolExecutionStatus || currentToolCall ? (
                          <div className="space-y-3">
                            {/* 工具执行状态卡片 */}
                            {toolExecutionStatus && (
                              <div className={`rounded-lg border p-4 ${
                                toolExecutionStatus.status === 'preparing' ? 'bg-green-50 border-green-200' :
                                toolExecutionStatus.status === 'executing' ? 'bg-green-50 border-green-200' :
                                toolExecutionStatus.status === 'writing' ? 'bg-green-50 border-green-200' :
                                toolExecutionStatus.status === 'complete' || toolExecutionStatus.status === 'done' ? 'bg-green-50 border-green-300' :
                                toolExecutionStatus.status === 'error' ? 'bg-red-50 border-red-200' :
                                'bg-gray-50 border-gray-200'
                              }`}>
                                {/* 状态头部 */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {(toolExecutionStatus.status === 'preparing' || toolExecutionStatus.status === 'executing' || toolExecutionStatus.status === 'writing') && (
                                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {toolExecutionStatus.status === 'complete' && <Check className="w-4 h-4 text-green-600" />}
                                    {toolExecutionStatus.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                                    <span className={`font-medium text-sm ${
                                      toolExecutionStatus.status === 'preparing' || toolExecutionStatus.status === 'executing' || toolExecutionStatus.status === 'writing' ? 'text-green-700' :
                                      toolExecutionStatus.status === 'complete' || toolExecutionStatus.status === 'done' ? 'text-green-700' :
                                      toolExecutionStatus.status === 'error' ? 'text-red-700' :
                                      'text-gray-700'
                                    }`}>
                                      {toolExecutionStatus.message}
                                    </span>
                                  </div>
                                  {/* 执行时间 */}
                                  {toolExecutionStatus.startTime && (
                                    <span className="text-xs text-gray-500">
                                      <Clock className="w-3 h-3 inline mr-1" />
                                      {((Date.now() - toolExecutionStatus.startTime) / 1000).toFixed(1)}s
                                    </span>
                                  )}
                                </div>

                                {/* 进度条（写入文件时） */}
                                {toolExecutionStatus.status === 'writing' && toolExecutionStatus.progress !== undefined && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                      <span>写入进度</span>
                                      <span>{toolExecutionStatus.progress}% ({toolExecutionStatus.written || 0}/{toolExecutionStatus.total || 0} bytes)</span>
                                    </div>
                                    <div className="w-full bg-green-200 rounded-full h-2">
                                      <div
                                        className="bg-green-600 h-2 rounded-full transition-all duration-150"
                                        style={{ width: `${toolExecutionStatus.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 文件名显示 */}
                                {toolExecutionStatus.fileName && (
                                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                                    <Bot className="w-3 h-3" />
                                    {toolExecutionStatus.fileName}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 代码输出区域 - 可折叠 */}
                            {showCodeBlock && codeOutput && (
                              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                {/* 可折叠头部 */}
                                <button
                                  onClick={() => setShowCodeBlock(!showCodeBlock)}
                                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-colors"
                                >
                                  <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Bot className="w-4 h-4" />
                                    <span className="font-mono">{codeBlockInfo?.fileName || 'File'}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {codeBlockInfo?.language} • {codeOutput.split('\n').length} lines
                                    </span>
                                  </div>
                                  {showCodeBlock ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  )}
                                </button>
                                {/* 代码内容 - 可折叠 */}
                                {showCodeBlock && (
                                  <pre className="p-4 bg-gray-900 text-gray-100 overflow-x-auto text-sm max-h-96 overflow-y-auto">
                                    <code>{codeOutput}</code>
                                    {toolExecutionStatus?.status === 'writing' && (
                                      <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse" />
                                    )}
                                  </pre>
                                )}
                              </div>
                            )}

                            {/* 思考步骤列表 */}
                            {thinkingSteps.length > 0 && (
                              <div className="space-y-1.5">
                                {thinkingSteps.map((step, index) => (
                                  <div key={step.timestamp} className="flex items-start gap-2 text-sm">
                                    <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className={step.result_summary ? "text-green-700 font-medium" : "text-blue-700"}>
                                        {step.content}
                                      </span>
                                      {step.result_summary && (
                                        <div className="mt-1 text-xs text-gray-600 truncate">
                                          {step.result_summary}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : !streamedThinking ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-manulife-green border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-manulife-grey">AI 正在思考中...</span>
                          </div>
                        ) : null}
                      </div>
                      {/* 停止按钮 */}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={stopStreaming}
                          className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Square className="w-3 h-3 mr-1" />
                          Stop
                        </Button>
                        <span className="text-xs text-manulife-grey">Click to interrupt generation</span>
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
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm border bg-white hover:bg-manulife-lightGreyBg",
                      selectedSkill
                        ? "border-manulife-green text-manulife-green"
                        : "border-manulife-lightGrey text-manulife-grey"
                    )}
                  >
                    <Puzzle className="w-3.5 h-3.5" />
                    <span>{getSelectedSkillName()}</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </button>

                  {showSkillDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSkillDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-manulife-lightGrey z-50 p-2 max-h-64 overflow-y-auto">
                        <div
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-manulife-lightGreyBg cursor-pointer rounded"
                          onClick={() => handleSelectSkill(null)}
                        >
                          <span className="text-sm text-manulife-grey">No Skill (Auto-select)</span>
                        </div>
                        {skills.map((skill) => (
                          <div
                            key={skill.id}
                            className={cn(
                              "px-2 py-2 hover:bg-manulife-lightGreyBg cursor-pointer rounded",
                              selectedSkill === skill.id && "bg-manulife-green/10"
                            )}
                            onClick={() => handleSelectSkill(skill.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-manulife-grey">{skill.name}</span>
                              {selectedSkill === skill.id && (
                                <Check className="w-4 h-4 text-manulife-green" />
                              )}
                            </div>
                            <p className="text-xs text-manulife-grey mt-0.5 line-clamp-2">{skill.description}</p>
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

            <WorkspacePanel isOpen={true} />
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

      <MemoryPanel isOpen={showMemoryPanel} onClose={() => setShowMemoryPanel(false)} conversationId={currentConversationId || undefined} />
    </div>
  );
}
