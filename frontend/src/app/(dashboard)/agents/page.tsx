"use client";

import * as React from "react";
import { Plus, Check, X, Bot, ShieldCheck, DollarSign, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: "online" | "offline";
  calls: number;
  skills: string[];
}

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "安全治理 Agent",
    description: "智能进行安全扫描、合规检查和漏洞修复建议",
    icon: ShieldCheck,
    status: "online",
    calls: 128,
    skills: ["安全扫描", "合规检查", "报告生成"],
  },
  {
    id: "2",
    name: "成本优化 Agent",
    description: "分析资源使用情况，提供成本优化建议",
    icon: DollarSign,
    status: "offline",
    calls: 45,
    skills: ["资源查询", "成本分析", "优化建议"],
  },
];

const agentTemplates = [
  { id: "general", name: "通用型", description: "多用途智能体" },
  { id: "security", name: "安全型", description: "专注安全治理" },
  { id: "ops", name: "运维型", description: "运维自动化" },
  { id: "dev", name: "开发型", description: "代码开发辅助" },
  { id: "analytic", name: "分析型", description: "数据分析报告" },
  { id: "custom", name: "空白模板", description: "完全自定义" },
];

const availableSkills = [
  { id: "sk1", name: "查询ECS实例" },
  { id: "sk2", name: "查询账单" },
  { id: "sk3", name: "调用FC函数" },
  { id: "sk4", name: "扫描安全漏洞" },
  { id: "sk5", name: "生成报告" },
  { id: "sk6", name: "部署执行" },
];

const knowledgeBases = [
  { id: "kb1", name: "运维手册" },
  { id: "kb2", name: "安全规范" },
  { id: "kb3", name: "架构文档" },
];

export default function AgentsPage() {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState("general");
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  const [selectedKb, setSelectedKb] = React.useState<string[]>([]);

  return (
    <div className="h-full bg-manulife-gray-light p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">智能体中心</h1>
            <p className="text-gray-500 mt-1">管理和配置您的智能体</p>
          </div>
          <Button className="bg-manulife-green hover:bg-manulife-teal text-white" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建智能体
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAgents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.id}
                className="bg-white rounded-lg border border-manulife-gray-border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-alert-success-bg rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-manulife-green" />
                  </div>
                  <Badge
                    variant={agent.status === "online" ? "default" : "outline"}
                    className={cn(
                      "flex items-center gap-1",
                      agent.status === "online"
                        ? "bg-alert-success-bg text-alert-success-text hover:bg-alert-success-bg"
                        : "text-gray-500"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        agent.status === "online" ? "bg-alert-success-border" : "bg-gray-400"
                      )}
                    />
                    {agent.status === "online" ? "运行中" : "已停止"}
                  </Badge>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{agent.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{agent.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">调用: {agent.calls} 次</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {agent.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 bg-manulife-gray-light text-gray-600 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-gray-700 border-manulife-gray-border hover:bg-manulife-gray-light">
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    配置
                  </Button>
                  <Button size="sm" className="flex-1 bg-manulife-green hover:bg-manulife-teal text-white">
                    {agent.status === "online" ? "停止" : "启动"}
                  </Button>
                </div>
              </div>
            );
          })}

          <div
            className="bg-white rounded-lg border-2 border-dashed border-manulife-gray-border p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-manulife-green transition-colors"
            onClick={() => setShowCreateDialog(true)}
          >
            <div className="w-10 h-10 bg-manulife-gray-light rounded-lg flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="font-medium text-gray-700">创建智能体</h3>
            <p className="text-sm text-gray-500 mt-1">点击添加新的自定义智能体</p>
          </div>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>创建智能体</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>智能体名称</Label>
              <Input placeholder="输入智能体名称" />
            </div>

            <div>
              <Label>选择模板</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {agentTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={cn(
                      "p-3 border rounded-lg text-left transition-colors",
                      selectedTemplate === t.id
                        ? "border-manulife-green bg-alert-success-bg"
                        : "border-manulife-gray-border hover:bg-manulife-gray-light"
                    )}
                  >
                    <div className="font-medium text-sm text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>描述</Label>
              <Textarea placeholder="描述这个智能体的用途..." />
            </div>

            <Separator />

            <div>
              <Label>可用 Skills</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-manulife-gray-light cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedSkills.includes(skill.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSkills([...selectedSkills, skill.id]);
                        } else {
                          setSelectedSkills(selectedSkills.filter(id => id !== skill.id));
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">{skill.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>绑定知识库 (可选)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {knowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-manulife-gray-light cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedKb.includes(kb.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedKb([...selectedKb, kb.id]);
                        } else {
                          setSelectedKb(selectedKb.filter(id => id !== kb.id));
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">{kb.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>系统提示词 (SOUL.md)</Label>
              <Textarea
                placeholder="你是一个专业的阿里云运维专家..."
                className="h-28 font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button className="bg-manulife-green hover:bg-manulife-teal text-white">创建智能体</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
