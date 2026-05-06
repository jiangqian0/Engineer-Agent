"use client";

import * as React from "react";
import { Folder, Upload, Download, Trash2, File, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface WorkspacePanelProps {
  isOpen?: boolean;
  className?: string;
}

export function WorkspacePanel({ isOpen = true, className }: WorkspacePanelProps) {
  const [files, setFiles] = React.useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadFiles = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to load workspace files:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, loadFiles]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/workspace/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = (filePath: string, fileName: string) => {
    window.open(`/api/workspace/download/${encodeURIComponent(filePath)}?filename=${encodeURIComponent(fileName)}`, "_blank");
  };

  const handleDelete = async (filePath: string) => {
    if (!confirm(`Delete file "${filePath}"?`)) return;

    try {
      const res = await fetch(`/api/workspace/files/${encodeURIComponent(filePath)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className={cn("bg-white border border-manulife-lightGrey", className)}>
      <div className="p-4 border-b border-manulife-lightGrey">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-manulife-green" />
            <h3 className="text-sm font-medium text-gray-900">Workspace</h3>
            <span className="text-xs text-manulife-grey">({files.length} files)</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-7 px-2"
              title="Upload file"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadFiles}
              disabled={loading}
              className="h-7 px-2"
              title="Refresh"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Folder className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="h-64">
        <div className="p-2">
          {loading && files.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-manulife-grey" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No files yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Agent will save files here
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-2 p-2 hover:bg-manulife-lightGreyBg rounded group"
                >
                  <File className="w-4 h-4 text-manulife-grey shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate" title={file.path}>
                      {file.name}
                    </p>
                    <p className="text-xs text-manulife-grey">
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(file.path, file.name)}
                      className="h-6 w-6 p-0"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(file.path)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}