"use client";

import * as React from "react";
import { Key, Save, Check, ExternalLink, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Model {
  id: string;
  name: string;
  provider: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  dashscope: "阿里云DashScope",
  "openai-compatible": "OpenAI 兼容"
};

const PROVIDER_HELP: Record<string, string> = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  dashscope: "https://dashscope.console.aliyun.com/api-key",
  "openai-compatible": "联系你的API提供商获取地址"
};

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = React.useState<{ openai?: string; anthropic?: string; dashscope?: string; "openai-compatible"?: string }>({});
  const [showKeys, setShowKeys] = React.useState<{ openai?: boolean; anthropic?: boolean; dashscope?: boolean; "openai-compatible"?: boolean }>({});
  const [models, setModels] = React.useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = React.useState("");
  const [temperature, setTemperature] = React.useState(0.7);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasKeys, setHasKeys] = React.useState<{ openai?: boolean; anthropic?: boolean; dashscope?: boolean; "openai-compatible"?: boolean }>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const config = await res.json();
        setSelectedModel(config.selected_model || "qwen3-max");
        setTemperature(config.temperature || 0.7);
        setHasKeys({
          openai: config.has_openai_key,
          anthropic: config.has_anthropic_key,
          dashscope: config.has_dashscope_key,
          "openai-compatible": config.has_openai_compatible_key
        });
      }

      const modelsRes = await fetch("/api/models");
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setModels(
          Object.entries(modelsData.models).map(([id, info]: [string, any]) => ({
            id,
            name: info.name,
            provider: info.provider
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider as keyof typeof prev] }));
  };

  const updateApiKey = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const selectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_keys: apiKeys,
          selected_model: selectedModel,
          temperature
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setApiKeys({});
        await loadConfig();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const groupModelsByProvider = () => {
    const grouped: Record<string, Model[]> = {};
    models.forEach(model => {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider].push(model);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-manulife-grey">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-manulife-green/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-manulife-green" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-manulife-grey text-sm">Configure API Keys and Model Settings</p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* API Keys Section */}
        <Card className="p-6 mb-6 border border-manulife-lightGrey">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-manulife-green" />
            <h2 className="text-lg font-medium text-gray-900">API Keys</h2>
          </div>
          <p className="text-sm text-manulife-grey mb-6">
            Configure your API keys for different AI providers. Leave empty to keep existing key.
          </p>

          <div className="space-y-6">
            {Object.entries({ openai: 'OpenAI', anthropic: 'Anthropic', dashscope: '阿里云DashScope', "openai-compatible": 'OpenAI 兼容' }).map(([provider, name]) => (
              <div key={provider} className="pb-4 border-b border-manulife-lightGrey last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    {name}
                    {hasKeys[provider as keyof typeof hasKeys] && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        <Check className="w-3 h-3 inline mr-1" />
                        Configured
                      </span>
                    )}
                  </Label>
                  <a 
                    href={PROVIDER_HELP[provider]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-manulife-green hover:underline flex items-center gap-1"
                  >
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showKeys[provider as keyof typeof showKeys] ? "text" : "password"}
                    placeholder={hasKeys[provider as keyof typeof hasKeys] ? "•••••••• (leave empty to keep)" : "Enter API key"}
                    value={apiKeys[provider as keyof typeof apiKeys] || ""}
                    onChange={(e) => updateApiKey(provider, e.target.value)}
                    className="flex-1 border-manulife-lightGrey font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleShowKey(provider)}
                  >
                    {showKeys[provider as keyof typeof showKeys] ? (
                      <span className="text-sm">🙈</span>
                    ) : (
                      <span className="text-sm">👁️</span>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Model Selection Section */}
        <Card className="p-6 mb-6 border border-manulife-lightGrey">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🤖</span>
            <h2 className="text-lg font-medium text-gray-900">Model Selection</h2>
          </div>
          <p className="text-sm text-manulife-grey mb-4">
            Select the AI model to use for conversations.
          </p>

          <div className="space-y-4">
            {Object.entries(groupModelsByProvider()).map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-manulife-green rounded-full" />
                  <span className="text-xs font-semibold text-manulife-grey uppercase tracking-wider">
                    {PROVIDER_NAMES[provider] || provider}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {providerModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => selectModel(model.id)}
                      className={`p-3 border text-left transition-all text-sm ${
                        selectedModel === model.id
                          ? "border-manulife-green bg-manulife-green/5"
                          : "border-manulife-lightGrey hover:border-manulife-green/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{model.name}</span>
                        {selectedModel === model.id && (
                          <Check className="w-4 h-4 text-manulife-green shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Temperature Setting */}
        <Card className="p-6 mb-6 border border-manulife-lightGrey">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚙️</span>
            <h2 className="text-lg font-medium text-gray-900">Generation Settings</h2>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                Temperature
                <span className="text-xs text-manulife-grey ml-2">
                  (Lower = precise, Higher = creative)
                </span>
              </Label>
              <span className="text-sm text-manulife-grey font-mono">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-manulife-lightGrey rounded-lg appearance-none cursor-pointer accent-manulife-green"
            />
            <div className="flex justify-between text-xs text-manulife-grey mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={loadConfig}
            variant="ghost"
            disabled={saving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="bg-manulife-green hover:bg-manulife-green/90 text-white"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Security Note */}
        <div className="mt-8 p-4 bg-manulife-lightGreyBg/50 border border-manulife-lightGrey">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-manulife-green" />
            Security Note
          </h3>
          <ul className="text-sm text-manulife-grey space-y-1">
            <li>• API keys are stored securely in your local backend storage</li>
            <li>• Keys are never exposed in frontend code or logs</li>
            <li>• For production deployments, use environment variables instead</li>
            <li>• Leave the input empty if you don't want to change an existing key</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
