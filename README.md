# Engineer Agent

AI Agent Hub 前端界面，支持多模型配置和对话功能。

## 功能介绍

### 主界面 (Chat)

主对话界面位于 `/chat`，包含以下功能：

- **对话功能**: 与 AI 模型进行实时对话
- **知识库选择**: 可选择相关的知识库文档（Operation Manual、Security Standards、Architecture Docs）
- **技能选择**: 可选择特定技能（Resource Query、Cost Analysis、Report Generation、FC Function Call）
- **执行日志**: 实时显示 Agent 执行步骤和日志
- **多模型支持**: 支持 Qwen3-Max、GPT-4o、Claude 等多种模型

### 设置页面 (Settings)

位于 `/settings`，用于配置系统：

- **API Key 管理**: 支持配置 OpenAI、Anthropic、阿里云 DashScope 等多个提供商的 API Key
- **模型选择**: 按提供商分组选择 AI 模型
- **Temperature 设置**: 调整生成内容的创造性（低 = 精确，高 = 创造）
- **配置状态**: 显示已配置的 Key 状态

## 快速开始

### 1. 安装依赖

```bash
# 前端
cd frontend
npm install

# 后端
cd backend
pip install -r requirements.txt
```

### 2. 启动后端

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

或使用环境变量配置：

```bash
# 在 backend/.env 中配置
LLM_API_KEY=你的API密钥
LLM_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen3-max
```

### 3. 启动前端

```bash
cd frontend
npm run dev
```

访问 `http://localhost:3000`

## 版本回退

### 查看提交历史

```bash
cd frontend
git log --oneline -10
```

### 回退到特定版本

#### 方法一：回退单个文件

```bash
# 查看某个文件的提交历史
git log --oneline --follow -- src/app/(dashboard)/chat/page.tsx

# 回退到特定版本（假设 commit hash 是 abc123）
git checkout abc123 -- src/app/(dashboard)/chat/page.tsx
```

#### 方法二：回退多个文件

如果需要回退整个前端到某个提交的所有文件：

```bash
# 获取完整提交哈希
git log --oneline -20

# 使用 git show 获取某个提交的完整信息
git show --stat abc123

# 回退前端目录下的所有文件
git checkout abc123 -- frontend/
```

#### 方法三：重置到某个提交（谨慎使用）

```bash
# 软重置（保留更改）
git reset --soft abc123

# 硬重置（丢弃所有更改，谨慎！）
git reset --hard abc123
```

### 常见场景

#### 回退到上一版提交

```bash
# 获取上一个提交的 hash
git checkout HEAD~1 -- frontend/
```

#### 查看特定版本的文件内容

```bash
# 不影响当前工作区，只是查看
git show abc123:frontend/src/app/(dashboard)/chat/page.tsx
```

#### 恢复被覆盖的文件

如果不小心覆盖了文件，但还没提交：

```bash
# 放弃所有未提交的更改
git checkout -- .
```

## 项目结构

```
Engineer Agent/
├── frontend/                 # Next.js 前端
│   ├── src/
│   │   ├── app/
│   │   │   └── (dashboard)/
│   │   │       ├── chat/    # 主对话页面
│   │   │       └── settings/# 设置页面
│   │   ├── components/      # React 组件
│   │   └── lib/             # 工具函数
│   └── next.config.js       # Next.js 配置
│
└── backend/                 # FastAPI 后端
    ├── app/
    │   ├── main.py          # 主应用
    │   ├── config.py        # 配置管理
    │   └── ...
    └── requirements.txt
```

## API 端点

后端提供以下主要接口：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/chat` | POST | 发送消息获取 AI 回复 |
| `/api/config` | GET | 获取当前配置 |
| `/api/config` | PUT | 更新配置（API Key、模型等） |
| `/api/models` | GET | 获取可用模型列表 |

## 技术栈

- **前端**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **后端**: FastAPI, Python 3.10+
- **AI 模型**: OpenAI GPT-4, Anthropic Claude, 阿里云 Qwen 等
