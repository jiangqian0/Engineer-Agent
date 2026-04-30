"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Folder,
  File,
  FileCode,
  FileText,
  Image,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Upload,
  Download,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  icon: React.ElementType;
  size?: string;
  modified: string;
}

const mockFiles: FileItem[] = [
  { id: "1", name: "src", type: "folder", icon: Folder, modified: "2 hours ago" },
  { id: "2", name: "tests", type: "folder", icon: Folder, modified: "1 day ago" },
  { id: "3", name: "README.md", type: "file", icon: FileText, size: "2.4 KB", modified: "3 days ago" },
  { id: "4", name: "main.py", type: "file", icon: FileCode, size: "12.8 KB", modified: "1 hour ago" },
  { id: "5", name: "config.json", type: "file", icon: FileCode, size: "1.2 KB", modified: "5 days ago" },
  { id: "6", name: "diagram.png", type: "file", icon: Image, size: "156 KB", modified: "1 week ago" },
];

const breadcrumb = ["Home", "Projects", "MyAgent"];

export default function WorkspacePage() {
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#002D62]">Workspace</h1>
          <p className="text-muted-foreground mt-1">Manage your project files and agent outputs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button variant="outline">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button className="bg-[#00693C] hover:bg-[#005844]">
            <Plus className="mr-2 h-4 w-4" />
            New File
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={item}>
              {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <Button
                variant="ghost"
                size="sm"
                className={cn(index === breadcrumb.length - 1 && "font-semibold text-[#002D62]")}
              >
                {item}
              </Button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <File className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Folder className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {mockFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                  selectedFile === file.id && "bg-[#00693C]/5"
                )}
                onClick={() => setSelectedFile(file.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-[#00693C]/10 flex items-center justify-center">
                  <file.icon className="h-5 w-5 text-[#00693C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#002D62] truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size && `${file.size} · `}{file.modified}
                  </p>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#002D62]">Agent Activity Log</CardTitle>
            <CardDescription>Recent operations on selected items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#00693C]/5 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#00693C]" />
                <span className="text-sm">File created: README.md</span>
                <span className="text-xs text-muted-foreground ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-sm">File modified: main.py</span>
                <span className="text-xs text-muted-foreground ml-auto">15 min ago</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-sm">Folder created: src/utils</span>
                <span className="text-xs text-muted-foreground ml-auto">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
