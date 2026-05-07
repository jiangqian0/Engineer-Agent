import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import httpx
import aiohttp

from dotenv import load_dotenv
from memory_store import memory_store
from memory_extractor import memory_extractor
from tools import get_registry
from skill_service import get_skills_list, get_skill_content
from agent import AgentLoop, ToolExecutor

load_dotenv()

app = FastAPI(title="Engineer Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"  # 允许所有 origin，在生产环境中应该限制
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def disable_buffering(request, call_next):
    response = await call_next(request)
    if hasattr(response, 'headers'):
        response.headers["X-Accel-Buffering"] = "no"
        response.headers["Cache-Control"] = "no-cache"
        response.headers["Connection"] = "keep-alive"
    return response

# 确保数据目录存在
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# 工作空间目录
WORKSPACE_DIR = Path(__file__).parent / "workspace"
WORKSPACE_DIR.mkdir(exist_ok=True)

# 数据库文件
DB_FILE = DATA_DIR / "conversations.json"

# 模型配置
AVAILABLE_MODELS = {
    "gpt-4o": {
        "name": "GPT-4o",
        "provider": "openai",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "gpt-4-turbo": {
        "name": "GPT-4 Turbo",
        "provider": "openai",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "gpt-3.5-turbo": {
        "name": "GPT-3.5 Turbo",
        "provider": "openai",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "claude-3.5-sonnet": {
        "name": "Claude 3.5 Sonnet",
        "provider": "anthropic",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "claude-3-sonnet": {
        "name": "Claude 3 Sonnet",
        "provider": "anthropic",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "qwen-max": {
        "name": "Qwen Max",
        "provider": "dashscope",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "qwen-plus": {
        "name": "Qwen Plus",
        "provider": "dashscope",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "qwen-turbo": {
        "name": "Qwen Turbo",
        "provider": "dashscope",
        "max_tokens": 4096,
        "temperature": 0.7
    },
    "qwen3-max": {
        "name": "Qwen3 Max",
        "provider": "openai-compatible",
        "max_tokens": 4096,
        "temperature": 0.7
    }
}

# 配置文件
CONFIG_FILE = DATA_DIR / "config.json"

def load_config() -> Dict:
    """加载配置"""
    # 优先从.env加载
    env_api_key = os.getenv("LLM_API_KEY")
    env_base_url = os.getenv("LLM_BASE_URL")
    env_model = os.getenv("LLM_MODEL")
    
    config = {
        "api_keys": {},
        "api_base_urls": {},
        "selected_model": "qwen3-max",
        "temperature": 0.7
    }
    
    # 如果有配置文件，读取它
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            saved_config = json.load(f)
            config.update(saved_config)
    
    # 如果有.env配置，优先使用并保存
    if env_api_key:
        config["api_keys"] = {
            "dashscope": env_api_key,
            "openai-compatible": env_api_key,
            "openai": env_api_key,
            "anthropic": env_api_key
        }
    if env_base_url:
        config["api_base_urls"] = {
            "openai-compatible": env_base_url
        }
    if env_model:
        config["selected_model"] = env_model
    
    # 保存配置（确保.env的配置被持久化）
    save_config(config)
    return config

def save_config(config: Dict):
    """保存配置"""
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

def load_conversations() -> Dict:
    """加载会话历史"""
    if DB_FILE.exists():
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"conversations": []}

def save_conversations(data: Dict):
    """保存会话历史"""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 数据模型
class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    enable_tools: Optional[bool] = False
    skill_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    model: str

class ToolCallRequest(BaseModel):
    name: str
    arguments: Dict

class ToolCallResponse(BaseModel):
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None

class Conversation(BaseModel):
    id: str
    title: str
    messages: List[Message]
    created_at: str
    updated_at: str

class ConfigUpdate(BaseModel):
    api_keys: Optional[Dict[str, str]] = None
    api_base_urls: Optional[Dict[str, str]] = None
    selected_model: Optional[str] = None
    temperature: Optional[float] = None

# API 路由
@app.get("/")
async def root():
    return {"message": "Engineer Agent API", "version": "1.0.0"}

@app.get("/api/skills/list")
async def list_skills():
    """获取所有可用的 Skills"""
    skills = get_skills_list()
    return {
        "skills": skills,
        "count": len(skills)
    }

@app.get("/api/skills/{skill_id}")
async def get_skill(skill_id: str):
    """获取指定 Skill 的完整内容"""
    content = get_skill_content(skill_id)
    if content is None:
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")
    return {
        "id": skill_id,
        "content": content
    }

@app.get("/api/skills/{skill_id}/metadata")
async def get_skill_metadata(skill_id: str):
    """获取指定 Skill 的元数据"""
    skills = get_skills_list()
    skill = next((s for s in skills if s["id"] == skill_id), None)
    if skill is None:
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")
    return skill

@app.get("/api/tools/list")
async def list_tools():
    """获取所有可用的工具"""
    registry = get_registry()
    return {
        "tools": registry.list_tools(),
        "count": len(registry.list_tools())
    }

@app.post("/api/tools/call")
async def call_tool(tool_name: str, arguments: Dict):
    """执行指定的工具调用"""
    registry = get_registry()
    result = await registry.execute(tool_name, arguments)
    return {
        "success": result.success,
        "result": result.result,
        "error": result.error
    }

# ==================== 工作空间 API ====================

@app.get("/api/workspace/files")
async def list_workspace_files():
    """获取工作空间中的所有文件"""
    files = []
    for path in WORKSPACE_DIR.rglob("*"):
        if path.is_file():
            rel_path = str(path.relative_to(WORKSPACE_DIR))
            stat = path.stat()
            files.append({
                "name": path.name,
                "path": rel_path,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    return {"files": files, "count": len(files)}

@app.get("/api/workspace/download/{filename:path}")
async def download_workspace_file(filename: str):
    """下载工作空间中的文件"""
    from fastapi.responses import FileResponse

    # 安全检查：确保路径在工作空间内
    file_path = WORKSPACE_DIR / filename
    resolved = file_path.resolve()
    workspace_resolved = WORKSPACE_DIR.resolve()
    if not str(resolved).startswith(str(workspace_resolved)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        file_path,
        filename=file_path.name,
        media_type="application/octet-stream"
    )

@app.delete("/api/workspace/files/{filename:path}")
async def delete_workspace_file(filename: str):
    """删除工作空间中的文件"""
    # 安全检查：确保路径在工作空间内
    file_path = WORKSPACE_DIR / filename
    resolved = file_path.resolve()
    workspace_resolved = WORKSPACE_DIR.resolve()
    if not str(resolved).startswith(str(workspace_resolved)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_path.unlink()
    return {"message": "File deleted"}

@app.post("/api/workspace/upload")
async def upload_to_workspace(request: Request):
    """上传文件到工作空间"""
    from fastapi import UploadFile, File

    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    # 保存到工作空间
    file_path = WORKSPACE_DIR / file.filename
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    return {
        "message": "File uploaded",
        "filename": file.filename,
        "size": len(content)
    }

@app.get("/api/workspace")
async def get_workspace_info():
    """获取工作空间信息"""
    files = []
    total_size = 0
    for path in WORKSPACE_DIR.rglob("*"):
        if path.is_file():
            stat = path.stat()
            files.append({
                "name": path.name,
                "path": str(path.relative_to(WORKSPACE_DIR)),
                "size": stat.st_size
            })
            total_size += stat.st_size

    return {
        "path": str(WORKSPACE_DIR),
        "file_count": len(files),
        "total_size": total_size
    }

@app.get("/api/models")
async def get_models():
    """获取可用的模型列表"""
    config = load_config()
    return {
        "models": AVAILABLE_MODELS,
        "selected": config.get("selected_model", "qwen3-max")
    }

@app.get("/api/config")
async def get_config():
    """获取当前配置"""
    config = load_config()
    # 不返回实际的API key，只返回是否存在
    return {
        "has_openai_key": bool(config.get("api_keys", {}).get("openai")),
        "has_anthropic_key": bool(config.get("api_keys", {}).get("anthropic")),
        "has_dashscope_key": bool(config.get("api_keys", {}).get("dashscope")),
        "has_openai_compatible_key": bool(config.get("api_keys", {}).get("openai-compatible")),
        "selected_model": config.get("selected_model", "qwen3-max"),
        "temperature": config.get("temperature", 0.7)
    }

@app.put("/api/config")
async def update_config(config_update: ConfigUpdate):
    """更新配置"""
    config = load_config()
    
    if config_update.api_keys is not None:
        if "api_keys" not in config:
            config["api_keys"] = {}
        config["api_keys"].update(config_update.api_keys)
        
        # 自动同步 API Key 到所有 Provider（如果只配置了一个）
        non_empty_keys = {k: v for k, v in config_update.api_keys.items() if v}
        if non_empty_keys:
            first_key = list(non_empty_keys.values())[0]
            first_provider = list(non_empty_keys.keys())[0]
            # 如果只配置了一个 Provider 的 Key，同步到其他 Provider
            if len(non_empty_keys) == 1 and first_key:
                all_providers = ["openai", "anthropic", "dashscope", "openai-compatible"]
                for provider in all_providers:
                    if provider != first_provider:
                        config["api_keys"][provider] = first_key
    
    if config_update.api_base_urls is not None:
        if "api_base_urls" not in config:
            config["api_base_urls"] = {}
        config["api_base_urls"].update(config_update.api_base_urls)
        
        # 自动设置 OpenAI 兼容的 Base URL（如果是 DashScope）
        if "openai-compatible" in config_update.api_base_urls:
            base_url = config_update.api_base_urls["openai-compatible"]
            # 如果是 DashScope 相关的 URL，设置默认
            if "dashscope" in base_url.lower() or "aliyun" in base_url.lower():
                if not config["api_base_urls"].get("openai-compatible"):
                    config["api_base_urls"]["openai-compatible"] = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    
    if config_update.selected_model is not None:
        if config_update.selected_model not in AVAILABLE_MODELS:
            raise HTTPException(status_code=400, detail="Invalid model")
        config["selected_model"] = config_update.selected_model
    
    if config_update.temperature is not None:
        config["temperature"] = config_update.temperature
    
    save_config(config)
    return {"message": "Config updated successfully"}

@app.get("/api/conversations")
async def get_conversations():
    """获取所有会话"""
    data = load_conversations()
    return {"conversations": data["conversations"]}

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """获取特定会话"""
    data = load_conversations()
    for conv in data["conversations"]:
        if conv["id"] == conversation_id:
            return conv
    raise HTTPException(status_code=404, detail="Conversation not found")

@app.patch("/api/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, request: Request):
    """更新会话（标题等）"""
    body = await request.json()
    data = load_conversations()

    for conv in data["conversations"]:
        if conv["id"] == conversation_id:
            if "title" in body:
                conv["title"] = body["title"]
            if "messages" in body:
                conv["messages"] = body["messages"]
            save_conversations(data)
            return {"message": "Conversation updated", "conversation": conv}

    raise HTTPException(status_code=404, detail="Conversation not found")

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除会话"""
    data = load_conversations()
    original_length = len(data["conversations"])
    data["conversations"] = [c for c in data["conversations"] if c["id"] != conversation_id]
    
    save_conversations(data)
    
    # 幂等操作：无论是否存在都返回成功
    return {"message": "Conversation deleted", "existed": len(data["conversations"]) < original_length}

# Memory API
class MemoryCreate(BaseModel):
    content: str
    description: str
    memory_type: str = "preference"
    tags: Optional[List[str]] = None
    confidence: float = 0.8
    conversation_id: Optional[str] = None

@app.get("/api/memories")
async def get_memories(memory_type: Optional[str] = None, conversation_id: Optional[str] = None):
    """获取所有记忆"""
    memories = memory_store.list_memories(memory_type, conversation_id)
    return {"memories": memories}

@app.get("/api/memories/{memory_id}")
async def get_memory(memory_id: str):
    """获取单个记忆"""
    memory = memory_store.get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory

@app.post("/api/memories")
async def create_memory(memory: MemoryCreate):
    """创建新记忆"""
    result = memory_store.create_memory(
        content=memory.content,
        description=memory.description,
        memory_type=memory.memory_type,
        tags=memory.tags,
        confidence=memory.confidence,
        conversation_id=memory.conversation_id
    )
    return result

@app.delete("/api/memories/{memory_id}")
async def delete_memory(memory_id: str):
    """删除记忆"""
    success = memory_store.delete_memory(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"message": "Memory deleted"}

@app.get("/api/memories/search")
async def search_memories(q: str, limit: int = 5):
    """搜索记忆"""
    results = memory_store.search_memories(q, limit)
    return {"memories": results}

@app.get("/api/memories/export")
async def export_memories(format: str = "json", ids: str = None):
    """导出记忆"""
    memory_ids = ids.split(",") if ids else None
    result = memory_store.export_memories(format, memory_ids)
    return result

class ImportRequest(BaseModel):
    data: Dict
    format: str = "json"

@app.post("/api/memories/import")
async def import_memories(request: ImportRequest):
    """导入记忆"""
    imported = memory_store.import_memories(request.data, request.format)
    return {"imported": len(imported), "memories": imported}

@app.get("/api/memories/context")
async def get_memories_context(limit: int = 10):
    """获取记忆上下文（用于注入对话）"""
    context = memory_store.get_memories_for_context(limit)
    return {"context": context}

class MemoryConfigUpdate(BaseModel):
    token_threshold: Optional[int] = None
    message_count_threshold: Optional[int] = None
    extract_interval: Optional[int] = None

@app.get("/api/memory/config")
async def get_memory_config():
    """获取记忆配置"""
    return memory_extractor.get_config()

@app.post("/api/memory/config")
async def update_memory_config(config: MemoryConfigUpdate):
    """更新记忆配置"""
    memory_extractor.update_config(
        token_threshold=config.token_threshold,
        message_count_threshold=config.message_count_threshold,
        extract_interval=config.extract_interval
    )
    return {"message": "Config updated", "config": memory_extractor.get_config()}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """发送消息并获取回复"""
    config = load_config()
    
    # 获取使用的模型
    model = request.model or config.get("selected_model", "qwen3-max")
    model_info = AVAILABLE_MODELS.get(model)
    
    if not model_info:
        raise HTTPException(status_code=400, detail="Invalid model")
    
    # 获取API key
    provider = model_info["provider"]
    api_key = config.get("api_keys", {}).get(provider)
    
    if not api_key:
        raise HTTPException(status_code=400, detail=f"No API key configured for {provider}")
    
    # 加载或创建会话
    data = load_conversations()
    
    if request.conversation_id:
        conversation = None
        for conv in data["conversations"]:
            if conv["id"] == request.conversation_id:
                conversation = conv
                break
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # 创建新会话
        import uuid
        conversation_id = str(uuid.uuid4())[:8]
        conversation = {
            "id": conversation_id,
            "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        data["conversations"].insert(0, conversation)
    
    # 添加用户消息
    user_message = {
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now().isoformat()
    }
    conversation["messages"].append(user_message)
    
    # 调用AI API
    try:
        if provider == "openai":
            response = await call_openai(api_key, model, conversation["messages"], config.get("temperature", 0.7))
        elif provider == "anthropic":
            response = await call_anthropic(api_key, model, conversation["messages"], config.get("temperature", 0.7))
        elif provider == "dashscope":
            response = await call_dashscope(api_key, model, conversation["messages"], config.get("temperature", 0.7))
        elif provider == "openai-compatible":
            base_url = config.get("api_base_urls", {}).get("openai-compatible", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
            response = await call_openai_compatible(api_key, base_url, model, conversation["messages"], config.get("temperature", 0.7))
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        # 添加AI回复
        assistant_message = {
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat()
        }
        conversation["messages"].append(assistant_message)
        conversation["updated_at"] = datetime.now().isoformat()
        
        # 保存
        save_conversations(data)
        
        return ChatResponse(
            message=response,
            conversation_id=conversation["id"],
            model=model
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def call_openai(api_key: str, model: str, messages: List[Dict], temperature: float) -> str:
    """调用OpenAI API"""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }
    
    async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]

async def call_anthropic(api_key: str, model: str, messages: List[Dict], temperature: float) -> str:
    """调用Anthropic API"""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    # 转换消息格式
    system_message = ""
    converted_messages = []
    for msg in messages:
        if msg["role"] == "system":
            system_message = msg["content"]
        else:
            converted_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    data = {
        "model": model,
        "messages": converted_messages,
        "temperature": temperature,
        "max_tokens": 4096
    }
    if system_message:
        data["system"] = system_message
    
    async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result["content"][0]["text"]

async def call_dashscope(api_key: str, model: str, messages: List[Dict], temperature: float) -> str:
    """调用阿里云DashScope API"""
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # 转换消息格式
    formatted_messages = []
    for msg in messages:
        if msg["role"] == "system":
            formatted_messages.append({"role": "system", "content": msg["content"]})
        elif msg["role"] == "user":
            formatted_messages.append({"role": "user", "content": msg["content"]})
        else:
            formatted_messages.append({"role": "assistant", "content": msg["content"]})
    
    data = {
        "model": model,
        "input": {
            "messages": formatted_messages
        },
        "parameters": {
            "temperature": temperature
        }
    }
    
    async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result["output"]["text"]

async def call_openai_compatible(api_key: str, base_url: str, model: str, messages: List[Dict], temperature: float) -> str:
    """调用OpenAI兼容的API"""
    url = f"{base_url}/chat/completions" if not base_url.endswith("/chat/completions") else base_url
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }

    async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]

def get_tools_description() -> str:
    """获取所有工具的描述，用于添加到system prompt"""
    registry = get_registry()
    tools = registry.list_tools()

    description = """## 工作空间 (Workspace)

**重要**：所有文件操作默认在工作空间目录 `workspace/` 下进行。
- 创建文件时，使用相对路径即可，例如 `script.py` 实际路径为 `workspace/script.py`
- 读取文件时，同样使用相对路径
- **不要尝试访问工作空间以外的任何路径**

---

## 可用的工具 (Tools)

你可以使用以下工具来完成任务：

"""

    for tool in tools:
        name = tool["name"]
        desc = tool["description"]
        schema = tool.get("input_schema", {})

        description += f"### {name}\n"
        description += f"{desc}\n"
        description += "参数：\n"

        props = schema.get("properties", {})
        required = schema.get("required", [])

        for param_name, param_info in props.items():
            param_type = param_info.get("type", "any")
            param_desc = param_info.get("description", "")
            is_required = "必需" if param_name in required else "可选"
            description += f"- `{param_name}` ({param_type}, {is_required}): {param_desc}\n"

        description += "\n"

    description += """## 工具使用规则

当你需要执行操作时，使用以下JSON格式请求工具：

```json
{
  "tool": "工具名称",
  "arguments": {
    "参数名": "参数值"
  }
}
```

**重要**：
- 使用工具前请三思，确认真的需要使用工具
- 执行文件操作前确认路径正确
- 执行危险命令（如删除文件）前要格外小心
- 如果不确定，先用 Glob 或 Read 工具查看目录结构

"""
    return description

async def execute_tool_calls(tool_calls: List[Dict], max_iterations: int = 5) -> List[Dict]:
    """执行一系列工具调用并返回结果"""
    registry = get_registry()
    results = []

    for i, tool_call in enumerate(tool_calls):
        if i >= max_iterations:
            results.append({
                "success": False,
                "error": f"达到最大迭代次数 {max_iterations}",
                "tool": tool_call.get("name", "unknown")
            })
            break

        tool_name = tool_call.get("name")
        arguments = tool_call.get("arguments", {})

        print(f"[Tool Call] Executing {tool_name} with args: {arguments}")

        result = await registry.execute(tool_name, arguments)
        results.append({
            "success": result.success,
            "result": result.result,
            "error": result.error,
            "tool": tool_name
        })

    return results

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """流式发送消息并获取回复 - 支持真正的 Agent 工具调用循环"""
    config = load_config()

    model = request.model or config.get("selected_model", "qwen3-max")
    model_info = AVAILABLE_MODELS.get(model)

    if not model_info:
        raise HTTPException(status_code=400, detail="Invalid model")

    provider = model_info["provider"]
    api_key = config.get("api_keys", {}).get(provider)

    if not api_key:
        raise HTTPException(status_code=400, detail=f"No API key configured for {provider}")

    data = load_conversations()

    if request.conversation_id:
        conversation = None
        for conv in data["conversations"]:
            if conv["id"] == request.conversation_id:
                conversation = conv
                break
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        import uuid
        conversation_id = str(uuid.uuid4())[:8]
        conversation = {
            "id": conversation_id,
            "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        data["conversations"].insert(0, conversation)

    user_message = {
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now().isoformat()
    }
    conversation["messages"].append(user_message)

    # 构建系统提示
    system_content_parts = []
    system_content_parts.append("你是一个智能助手。")

    skills_list = get_skills_list()
    if skills_list:
        skills_info = "\n\n## 可用 Skills\n\n当用户询问可用技能或需要特定专业帮助时，你可以推荐以下 skills：\n"
        for skill in skills_list:
            skills_info += f"- **{skill['name']}**: {skill['description']}\n"
        skills_info += "\n如果用户要求使用某个 skill，请在回复中直接使用该 skill 的知识回答，**不要输出 skill 的内部格式或指令内容**。\n"
        system_content_parts.append(skills_info)

    if request.skill_id:
        skill_content = get_skill_content(request.skill_id)
        if skill_content:
            skill_content = re.sub(r'\{[^{}]*"tool"[^{}]*\}', '[工具调用格式已省略]', skill_content)
            skill_content = re.sub(r'\{[^{}]*"arguments"[^{}]*\}', '[参数格式已省略]', skill_content)
            system_content_parts.append(f"\n\n## 当前 Skill 指引\n\n{skill_content}\n\n**注意：Skill 指引仅供内部参考，请直接回答用户问题，不要输出 Skill 的内部格式或指令。**")

    if request.enable_tools:
        tools_description = get_tools_description()
        system_content_parts.append(f"\n\n## 可用工具\n\n{tools_description}")

    system_prompt = "\n".join(system_content_parts)

    async def event_generator():
        full_response = ""
        thinking_content = ""

        try:
            # 根据提供商选择调用方式
            if provider == "openai-compatible":
                base_url = config.get("api_base_urls", {}).get("openai-compatible", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")

                # 创建 Agent 循环
                print(f"[DEBUG] enable_tools = {request.enable_tools}, allowed_tools = {None if request.enable_tools else []}")
                agent = AgentLoop(
                    llm_provider="openai-compatible",
                    api_key=api_key,
                    model=model,
                    system_prompt=system_prompt,
                    allowed_tools=None if request.enable_tools else [],
                    max_iterations=15,
                    base_url=base_url
                )

                # 复制对话历史
                for msg in conversation["messages"]:
                    if msg["role"] in ["user", "assistant"]:
                        agent.add_message(msg["role"], msg["content"])

                # 流式运行
                last_thinking_content = ""  # 上一次发送的思考内容，用于去重
                async for event in agent.run_stream(request.message):
                    print(f"[DEBUG] Received event type: {event.get('type')}")
                    if event["type"] == "thinking":
                        thinking_content = event["content"]
                        # 只有内容发生变化时才发送
                        if thinking_content != last_thinking_content:
                            print(f"[DEBUG] Sending thinking event, content length: {len(thinking_content)}, content: {thinking_content[:100] if thinking_content else ''}")
                            # 发送思考内容（增量更新，完整累积）
                            yield f"data: {json.dumps({'type': 'thinking', 'content': thinking_content, 'delta': True}, ensure_ascii=False)}\n\n"
                            last_thinking_content = thinking_content

                    elif event["type"] == "thinking_end":
                        # 思考结束标记，附带完整历史
                        full_history = event.get("full_history", "")
                        yield f"data: {json.dumps({'type': 'thinking_end', 'content': '', 'full_history': full_history}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "thinking_step":
                        # 关键步骤标记（工具调用等）
                        step_content = event.get("content", "")
                        details = event.get("details", "")
                        result_summary = event.get("result_summary", "")
                        yield f"data: {json.dumps({'type': 'thinking_step', 'content': step_content, 'details': details, 'result_summary': result_summary}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "code_output":
                        # 代码输出（写入文件时的流式显示）
                        code_content = event.get("content", "")
                        tool_name = event.get("tool", "unknown")
                        progress = event.get("progress", 0)
                        written = event.get("written", 0)
                        total = event.get("total", 0)
                        yield f"data: {json.dumps({'type': 'code_output', 'content': code_content, 'tool': tool_name, 'progress': progress, 'written': written, 'total': total}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "code_block_start":
                        # 🎯 Cursor风格：代码块开始
                        cb_file_path = event.get("file_path", "")
                        cb_file_name = event.get("file_name", "")
                        cb_language = event.get("language", "text")
                        cb_total_size = event.get("total_size", 0)
                        yield f"data: {json.dumps({'type': 'code_block_start', 'file_path': cb_file_path, 'file_name': cb_file_name, 'language': cb_language, 'total_size': cb_total_size}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "code_block_end":
                        # 🎯 Cursor风格：代码块结束
                        cb_file_name = event.get("file_name", "")
                        cb_total_lines = event.get("total_lines", 0)
                        yield f"data: {json.dumps({'type': 'code_block_end', 'file_name': cb_file_name, 'total_lines': cb_total_lines}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "status":
                        # 状态更新（执行中、写入文件、完成等）
                        status_content = event.get("content", "")
                        tool_name = event.get("tool", "")
                        message = event.get("message", "")
                        file_name = event.get("file_name", "")
                        total_size = event.get("total_size", 0)
                        print(f"[DEBUG] Sending status event: {status_content} - {tool_name}")
                        yield f"data: {json.dumps({'type': 'status', 'content': status_content, 'tool': tool_name, 'message': message, 'file_name': file_name, 'total_size': total_size}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "token":
                        full_response += event["content"]
                        # 发送 token
                        yield f"data: {json.dumps({'type': 'token', 'content': event['content'], 'done': False}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "tool_calls":
                        print(f"[DEBUG] main.py forwarding tool_calls event with {len(event['content'])} tools")
                        for tc in event["content"]:
                            tool_name = tc.get("function", {}).get("name", "unknown")
                            tool_id = tc.get("id", "")
                            yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool_name, 'tool_call_id': tool_id}, ensure_ascii=False)}\n\n"
                        continue

                    elif event["type"] == "tool_call":
                        print(f"[DEBUG] main.py forwarding tool_call event: {event}")
                        tool_name = event["content"].get("function", {}).get("name", "unknown")
                        tool_id = event["content"].get("id", "")
                        yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool_name, 'tool_call_id': tool_id}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "tool_result":
                        result = event["content"]
                        tool_id = event.get("tool_call_id", "")
                        success = getattr(result, 'success', False)
                        result_data = getattr(result, 'result', None)
                        error = getattr(result, 'error', None)
                        yield f"data: {json.dumps({'type': 'tool_result', 'tool_call_id': tool_id, 'success': success, 'result': result_data, 'error': error}, ensure_ascii=False)}\n\n"

                    elif event["type"] == "done":
                        full_response = event["content"]
                        break

                    elif event["type"] == "error":
                        yield f"data: {json.dumps({'type': 'error', 'content': event['content']}, ensure_ascii=False)}\n\n"

            else:
                # 其他提供商使用简化的非工具调用流
                async for token in call_dashscope_stream(api_key, model, [{"role": "system", "content": system_prompt}] + conversation["messages"], config.get("temperature", 0.7)):
                    if token:
                        if token.startswith("[THINKING]"):
                            # 提取思考内容并发送
                            import re
                            thinking_match = re.search(r'\[THINKING\]([\s\S]*?)\[\/THINKING\]', token)
                            if thinking_match:
                                thinking_text = thinking_match.group(1)
                                thinking_content = thinking_text
                                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking_text}, ensure_ascii=False)}\n\n"
                        else:
                            full_response += token
                            yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[DEBUG] Exception in event_generator: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # 保存回复
        assistant_message = {
            "role": "assistant",
            "content": full_response,
            "timestamp": datetime.now().isoformat()
        }
        conversation["messages"].append(assistant_message)
        conversation["updated_at"] = datetime.now().isoformat()
        save_conversations(data)

        asyncio.create_task(memory_extractor.auto_extract_async(
            conversation["messages"],
            conversation["id"]
        ))

        yield f"data: {json.dumps({'token': '', 'done': True, 'conversation_id': conversation['id']}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )

async def call_openai_stream(api_key: str, model: str, messages: List[Dict], temperature: float):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
        "stream_options": {
            "include_usage": True
        },
        "enable_thinking": True
    }

    async with httpx.AsyncClient(timeout=120.0, trust_env=False) as client:
        async with client.stream("POST", url, headers=headers, json=data) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    if line == "data: [DONE]":
                        break
                    chunk = json.loads(line[6:])
                    if "choices" in chunk and len(chunk["choices"]) > 0:
                        delta = chunk["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]

async def call_anthropic_stream(api_key: str, model: str, messages: List[Dict], temperature: float):
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }

    converted_messages = []
    for msg in messages:
        if msg["role"] == "system":
            continue
        converted_messages.append({"role": msg["role"], "content": msg["content"]})

    data = {
        "model": model,
        "messages": converted_messages,
        "temperature": temperature,
        "max_tokens": 4096,
        "stream": True
    }

    async with httpx.AsyncClient(timeout=120.0, trust_env=False) as client:
        async with client.stream("POST", url, headers=headers, json=data) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    if line == "data: [DONE]":
                        break
                    chunk = json.loads(line[6:])
                    if "type" in chunk and chunk["type"] == "content_block_delta":
                        if "text" in chunk:
                            yield chunk["text"]

async def call_dashscope_stream(api_key: str, model: str, messages: List[Dict], temperature: float):
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    formatted_messages = []
    for msg in messages:
        if msg["role"] == "system":
            formatted_messages.append({"role": "system", "content": msg["content"]})
        elif msg["role"] == "user":
            formatted_messages.append({"role": "user", "content": msg["content"]})
        else:
            formatted_messages.append({"role": "assistant", "content": msg["content"]})

    data = {
        "model": model,
        "input": {"messages": formatted_messages},
        "parameters": {
            "temperature": temperature,
            "stream": True,
            "thinking": True
        }
    }

    token_count = 0
    thinking_buffer = ""
    content_buffer = ""
    in_thinking = False

    try:
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True, trust_env=False) as client:
            async with client.stream("POST", url, headers=headers, json=data) as response:
                response.raise_for_status()
                buffer = ""
                async for chunk in response.aiter_bytes():
                    try:
                        buffer += chunk.decode("utf-8")
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()
                            if not line:
                                continue
                            if line.startswith("data: "):
                                if line == "data: [DONE]":
                                    if thinking_buffer:
                                        yield f"[THINKING]{thinking_buffer}[/THINKING]"
                                    if content_buffer:
                                        yield content_buffer
                                    return
                                try:
                                    chunk_data = json.loads(line[6:])
                                    if "output" in chunk_data:
                                        output = chunk_data["output"]

                                        thinking_content = output.get("thinking_content") or output.get("reasoning_content") or output.get("thinking") or ""
                                        text_content = output.get("text") or output.get("content") or ""

                                        if thinking_content:
                                            thinking_buffer += thinking_content
                                        if text_content:
                                            content_buffer += text_content
                                            if thinking_buffer and not in_thinking:
                                                yield f"[THINKING]{thinking_buffer}[/THINKING]"
                                                thinking_buffer = ""
                                                in_thinking = True
                                            if content_buffer:
                                                yield content_buffer
                                                content_buffer = ""
                                    elif "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                        delta = chunk_data["choices"][0].get("delta", {})
                                        if "thinking" in delta:
                                            thinking_buffer += delta["thinking"]
                                        if "content" in delta:
                                            content_buffer += delta["content"]
                                except json.JSONDecodeError:
                                    continue
                    except Exception as e:
                        continue

        if thinking_buffer:
            yield f"[THINKING]{thinking_buffer}[/THINKING]"
        if content_buffer:
            yield content_buffer

    except Exception as e:
        pass

async def call_dashscope_non_streaming(api_key: str, model: str, messages: List[Dict], temperature: float):
    import asyncio
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    formatted_messages = []
    for msg in messages:
        if msg["role"] == "system":
            formatted_messages.append({"role": "system", "content": msg["content"]})
        elif msg["role"] == "user":
            formatted_messages.append({"role": "user", "content": msg["content"]})
        else:
            formatted_messages.append({"role": "assistant", "content": msg["content"]})

    data = {
        "model": model,
        "input": {"messages": formatted_messages},
        "parameters": {"temperature": temperature, "stream": False, "thinking": True}
    }

    async with httpx.AsyncClient(timeout=120.0, trust_env=False) as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()

        thinking_content = ""
        full_text = ""

        if "output" in result:
            output = result["output"]
            if "thinking_content" in output:
                thinking_content = output["thinking_content"]
            if "text" in output:
                full_text = output["text"]

        if thinking_content:
            yield f"[THINKING]{thinking_content}[/THINKING]"

        if full_text:
            for i in range(0, len(full_text), 3):
                await asyncio.sleep(0.02)
                yield full_text[i:i+3]

async def call_openai_compatible_stream(api_key: str, base_url: str, model: str, messages: List[Dict], temperature: float):
    url = f"{base_url}/chat/completions" if not base_url.endswith("/chat/completions") else base_url
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
        "stream_options": {
            "include_usage": True
        }
    }

    # 检查是否是 Qwen 模型，支持思考模式
    is_qwen_model = "qwen" in model.lower()
    if is_qwen_model:
        data["thinking"] = {"type": "enabled"}

    thinking_buffer = ""
    thinking_started = False
    thinking_ended = False

    try:
        # 禁用系统代理，避免 TLS 连接问题
        import os
        original_http_proxy = os.environ.pop('HTTP_PROXY', None)
        original_https_proxy = os.environ.pop('HTTPS_PROXY', None)
        original_http_proxy = os.environ.pop('http_proxy', original_http_proxy)
        original_https_proxy = os.environ.pop('https_proxy', original_https_proxy)

        async with httpx.AsyncClient(
            timeout=120.0,
            headers={"Accept-Encoding": "identity"},  # 禁用压缩，确保流式传输
            trust_env=False  # 禁用环境变量中的代理配置
        ) as client:
            async with client.stream("POST", url, headers=headers, json=data) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        if line == "data: [DONE]":
                            # 如果有剩余的思考内容没有发送，发送结束标记
                            if thinking_buffer and not thinking_ended:
                                yield "[/THINKING]"
                                thinking_ended = True
                            break
                        try:
                            chunk = json.loads(line[6:])
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})

                                # 尝试多种可能的 thinking 字段名
                                thinking_content = (
                                    delta.get("reasoning_content") or
                                    delta.get("thinking") or
                                    delta.get("thinking_content") or
                                    delta.get("reasoning") or
                                    ""
                                )

                                # 处理普通内容 - 流式输出
                                content = delta.get("content")

                                if thinking_content:
                                    # 如果还没有开始思考块，发送开始标记
                                    if not thinking_started:
                                        yield "[THINKING]"
                                        thinking_started = True
                                    thinking_buffer += thinking_content

                                if content:
                                    # 如果之前有思考内容，发送结束标记并清空
                                    if thinking_buffer and not thinking_ended:
                                        yield "[/THINKING]"
                                        thinking_ended = True
                                        thinking_buffer = ""  # 清空缓冲区
                                    # 流式输出普通内容
                                    yield content
                        except json.JSONDecodeError:
                            continue
    except Exception as e:
        raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
