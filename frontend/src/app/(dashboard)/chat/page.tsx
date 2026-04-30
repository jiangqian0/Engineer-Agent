"use client";

import * as React from "react";
import { Send, Paperclip, Puzzle, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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

const mockSteps: Step[] = [
  { id: "1", title: "Understanding Intent", status: "completed" },
  { id: "2", title: "Selecting Agent: Cost Optimization", status: "completed" },
  { id: "3", title: "Querying ECS Resources", status: "running" },
  { id: "4", title: "Generating Report", status: "pending" },
];

const mockLogs: LogEntry[] = [
  { id: "1", type: "info", message: "Starting analysis...", timestamp: "14:32:01" },
  { id: "2", type: "success", message: "Cost optimization agent required", timestamp: "14:32:02" },
  { id: "3", type: "info", message: "Fetching ECS instance list...", timestamp: "14:32:03" },
  { id: "4", type: "success", message: "12 active instances found", timestamp: "14:32:05" },
  { id: "5", type: "info", message: "Retrieving billing data...", timestamp: "14:32:06" },
];

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
  const [isRunning, setIsRunning] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsRunning(true);
  };

  const toggleKb = (id: string) => {
    setSelectedKb((prev) =>
      prev.includes(id) ? prev.filter((kb) => kb !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((sk) => sk !== id) : [...prev, id]
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

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-none mx-auto space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-manulife-green flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">AI</span>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">AliCloud Agent Hub</h1>
              <p className="text-manulife-grey">Select actions or start conversation</p>
            </div>
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

            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your request..."
                className="w-full resize-none border-manulife-lightGrey focus:border-manulife-green focus:ring-1 focus:ring-manulife-green py-3 px-4 pr-12"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 bottom-2 bg-manulife-green hover:bg-manulife-green/90 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="w-80 border-l border-manulife-lightGrey bg-manulife-lightGreyBg flex flex-col">
        <div className="p-4 border-b border-manulife-lightGrey bg-white">
          <h2 className="font-semibold text-gray-900">Agent Execution</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white border border-manulife-lightGrey p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Task Breakdown</h3>
            <div className="space-y-2">
              {mockSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-4 h-4 flex items-center justify-center",
                      step.status === "completed"
                        ? "bg-alert-success-border"
                        : step.status === "running"
                        ? "bg-amber-500 animate-pulse"
                        : step.status === "error"
                        ? "bg-alert-error-border"
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
                        ? "text-alert-success-text"
                        : step.status === "running"
                        ? "text-amber-700"
                        : "text-manulife-grey"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-manulife-lightGrey p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Real-time Logs</h3>
            <div className="space-y-1.5 font-mono text-xs">
              {mockLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2 py-1 px-2",
                    log.type === "info" && "bg-alert-info-bg border-l-2 border-alert-info-border",
                    log.type === "success" && "bg-alert-success-bg border-l-2 border-alert-success-border",
                    log.type === "warning" && "bg-alert-warning-bg border-l-2 border-alert-warning-border",
                    log.type === "error" && "bg-alert-error-bg border-l-2 border-alert-error-border"
                  )}
                >
                  <span className="text-manulife-grey shrink-0">[{log.timestamp}]</span>
                  <span className={cn(
                    log.type === "info" && "text-alert-info-text",
                    log.type === "success" && "text-alert-success-text",
                    log.type === "warning" && "text-alert-warning-text",
                    log.type === "error" && "text-alert-error-text"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
