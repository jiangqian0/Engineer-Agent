import os
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import json
import httpx

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Engineer Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 确保数据目录存在
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

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

class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    model: str

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

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除会话"""
    data = load_conversations()
    original_length = len(data["conversations"])
    data["conversations"] = [c for c in data["conversations"] if c["id"] != conversation_id]
    
    if len(data["conversations"]) == original_length:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    save_conversations(data)
    return {"message": "Conversation deleted"}

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
    
    async with httpx.AsyncClient(timeout=60.0) as client:
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
    
    async with httpx.AsyncClient(timeout=60.0) as client:
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
    
    async with httpx.AsyncClient(timeout=60.0) as client:
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
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
