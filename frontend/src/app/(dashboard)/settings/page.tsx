"use client";

import * as React from "react";
import { Key, Plus, Eye, EyeOff, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([
    {
      id: "1",
      name: "Default Key",
      key: "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
      createdAt: "2024-01-15"
    }
  ]);
  
  const [newKeyName, setNewKeyName] = React.useState("");
  const [showKeys, setShowKeys] = React.useState<Set<string>>(new Set());

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: "sk-" + Math.random().toString(36).substring(2, 34),
      createdAt: new Date().toISOString().split("T")[0]
    };
    
    setApiKeys(prev => [...prev, newKey]);
    setNewKeyName("");
  };

  const deleteKey = (id: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== id));
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-manulife-green/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-manulife-green" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
            <p className="text-manulife-grey text-sm">Manage your API keys securely</p>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Add New API Key</h2>
          <div className="flex gap-3">
            <Input
              placeholder="Enter key name..."
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="border-manulife-lightGrey"
              onKeyDown={(e) => {
                if (e.key === "Enter") addKey();
              }}
            />
            <Button
              onClick={addKey}
              className="bg-manulife-green hover:bg-manulife-green/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Key
            </Button>
          </div>
        </Card>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Your API Keys</h2>
          
          {apiKeys.length === 0 ? (
            <div className="text-center py-12 text-manulife-grey">
              No API keys yet. Add your first key above.
            </div>
          ) : (
            apiKeys.map((apiKey) => (
              <Card key={apiKey.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{apiKey.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-sm font-mono text-manulife-grey bg-manulife-lightGreyBg px-2 py-1">
                        {showKeys.has(apiKey.id) 
                          ? apiKey.key 
                          : apiKey.key.slice(0, 8) + "..."
                        }
                      </code>
                      <button
                        onClick={() => toggleShowKey(apiKey.id)}
                        className="text-manulife-grey hover:text-gray-900"
                      >
                        {showKeys.has(apiKey.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <span className="text-xs text-manulife-grey">
                        Created: {apiKey.createdAt}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteKey(apiKey.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-manulife-lightGrey">
          <div className="bg-manulife-lightGreyBg/50 p-4 text-sm text-manulife-grey">
            <strong>Security Note:</strong> Keep your API keys secure. Never share them publicly or commit them to version control.
          </div>
        </div>
      </div>
    </div>
  );
}
