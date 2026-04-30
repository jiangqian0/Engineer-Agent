"use client";

import * as React from "react";
import { Plus, Folder, FileText, FileSpreadsheet, Presentation, ChevronDown, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface KnowledgeItem {
  id: string;
  name: string;
  type: "folder" | "pdf" | "word" | "md" | "xlsx";
  size?: string;
  items?: KnowledgeItem[];
}

const initialKnowledge: KnowledgeItem[] = [
  {
    id: "1",
    name: "运维手册",
    type: "folder",
    items: [
      { id: "1-1", name: "ECS运维指南.pdf", type: "pdf", size: "2.3 MB" },
      { id: "1-2", name: "故障处理流程.docx", type: "word", size: "1.1 MB" },
      { id: "1-3", name: "部署标准规范.md", type: "md", size: "45 KB" },
    ],
  },
  {
    id: "2",
    name: "安全规范",
    type: "folder",
    items: [
      { id: "2-1", name: "等保合规要求.pdf", type: "pdf", size: "3.5 MB" },
      { id: "2-2", name: "安全基线检查表.xlsx", type: "xlsx", size: "890 KB" },
    ],
  },
  {
    id: "3",
    name: "架构文档",
    type: "folder",
    items: [
      { id: "3-1", name: "系统架构图.pptx", type: "pdf", size: "4.2 MB" },
    ],
  },
];

function KnowledgeNode({ item, depth = 0 }: { item: KnowledgeItem; depth?: number }) {
  const [isExpanded, setIsExpanded] = React.useState(depth < 1);

  const Icon = () => {
    switch (item.type) {
      case "folder":
        return <Folder className="w-4 h-4 text-manulife-green" />;
      case "pdf":
      case "word":
      case "xlsx":
      case "md":
        return <FileText className="w-4 h-4 text-gray-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-manulife-gray-light",
          depth === 0 ? "font-medium" : "text-sm"
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => item.items && setIsExpanded(!isExpanded)}
      >
        {item.items && (
          <span className="text-gray-400">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
        {!item.items && <span className="w-3.5" />}
        <Icon />
        <span className="flex-1 truncate text-gray-700">{item.name}</span>
        {item.size && <span className="text-xs text-gray-400">{item.size}</span>}
      </div>

      {item.items && isExpanded && (
        <div>
          {item.items.map((child) => (
            <KnowledgeNode key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  const [knowledge, setKnowledge] = React.useState<KnowledgeItem[]>(initialKnowledge);

  return (
    <div className="h-full bg-manulife-gray-light p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">知识库</h1>
            <p className="text-gray-500 mt-1">管理公司文档和知识库</p>
          </div>
          <Button className="bg-manulife-green hover:bg-manulife-teal text-white">
            <Upload className="w-4 h-4 mr-2" />
            上传文档
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-manulife-gray-border overflow-hidden">
          <div className="p-4 border-b border-manulife-gray-border bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700">文档列表</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-alert-info-bg rounded p-3 border border-alert-info-border">
                <div className="text-2xl font-bold text-manulife-blue">6</div>
                <div className="text-xs text-gray-600">文档总数</div>
              </div>
              <div className="bg-alert-success-bg rounded p-3 border border-alert-success-border">
                <div className="text-2xl font-bold text-manulife-green">3</div>
                <div className="text-xs text-gray-600">分类数</div>
              </div>
              <div className="bg-alert-warning-bg rounded p-3 border border-alert-warning-border">
                <div className="text-2xl font-bold text-amber-600">12</div>
                <div className="text-xs text-gray-600">MB存储</div>
              </div>
            </div>
          </div>

          <div className="p-2">
            {knowledge.map((item) => (
              <KnowledgeNode key={item.id} item={item} />
            ))}
          </div>

          <div className="p-4 border-t border-manulife-gray-border">
            <Button variant="outline" className="w-full text-gray-700 border-manulife-gray-border hover:bg-manulife-gray-light">
              <Plus className="w-4 h-4 mr-2" />
              新建文件夹
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
