"""
Agent 循环 - 实现 LLM + 工具调用的迭代执行
"""

import json
import re
import asyncio
from typing import Dict, Any, List, Optional, Callable, AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum

# 使用绝对导入
from agent.executor import ToolExecutor


def convert_to_openai_tools(tools: List[Dict]) -> List[Dict]:
    """将工具定义转换为 OpenAI API 格式"""
    if not tools:
        return []
    openai_tools = []
    for tool in tools:
        # 检查是否已经是 OpenAI 格式
        if tool.get("type") == "function" and "function" in tool:
            openai_tools.append(tool)
        elif "name" in tool:
            # 转换自定义格式到 OpenAI 格式
            openai_tool = {
                "type": "function",
                "function": {
                    "name": tool.get("name"),
                    "description": tool.get("description", ""),
                    "parameters": tool.get("input_schema", {"type": "object"})
                }
            }
            openai_tools.append(openai_tool)
        else:
            # 已经是某种格式，直接使用
            openai_tools.append(tool)
    return openai_tools


class AgentState(Enum):
    IDLE = "idle"
    THINKING = "thinking"
    TOOL_CALLING = "tool_calling"
    RESPONDING = "responding"
    DONE = "done"
    ERROR = "error"


@dataclass
class ToolCallMessage:
    """工具调用消息"""
    id: str
    name: str
    arguments: Dict[str, Any]
    result: Optional[ToolExecutor] = None  # 将在子类中替换为 ToolResult


@dataclass
class AgentMessage:
    """Agent 消息"""
    role: str  # "user", "assistant", "tool"
    content: str = ""
    tool_calls: List[Dict] = field(default_factory=list)
    tool_call_id: Optional[str] = None


@dataclass
class AgentResponse:
    """Agent 响应"""
    content: str
    state: AgentState
    thinking: Optional[str] = None
    tool_calls: List[Dict] = field(default_factory=list)
    messages: List[AgentMessage] = field(default_factory=list)


class AgentLoop:
    """
    Agent 执行循环

    支持多种 LLM 提供商的工具调用：
    - OpenAI (原生 function calling)
    - Anthropic (tool use)
    - DashScope (通义千问)
    - OpenAI Compatible (如通义千问国际版)
    """

    def __init__(
        self,
        llm_provider: str,
        api_key: str,
        model: str,
        system_prompt: str = "",
        allowed_tools: Optional[List[str]] = None,
        max_iterations: int = 15,
        base_url: Optional[str] = None,
    ):
        self.llm_provider = llm_provider
        self.api_key = api_key
        self.model = model
        self.system_prompt = system_prompt
        self.allowed_tools = allowed_tools
        self.max_iterations = max_iterations
        self.base_url = base_url

        self.tool_executor = ToolExecutor(allowed_tools=allowed_tools)
        self.messages: List[Dict[str, Any]] = []

        # 回调函数
        self.on_thinking: Optional[Callable] = None
        self.on_tool_call: Optional[Callable] = None
        self.on_token: Optional[Callable] = None

    def set_system_prompt(self, prompt: str):
        """设置系统提示"""
        self.system_prompt = prompt

    def add_message(self, role: str, content: str):
        """添加用户消息"""
        self.messages.append({"role": role, "content": content})

    def _extract_thinking(self, text: str) -> tuple:
        """提取思考内容 [THINKING]...[/THINKING]"""
        thinking_regex = re.compile(r'\[THINKING\]([\s\S]*?)\[\/THINKING\]')
        match = thinking_regex.search(text)
        if match:
            thinking = match.group(1).strip()
            content = thinking_regex.sub('', text).strip()
            return thinking, content
        return None, text

    async def run(self, user_message: str) -> AgentResponse:
        """
        运行 Agent 循环

        Args:
            user_message: 用户消息

        Returns:
            AgentResponse: 最终响应
        """
        # 添加用户消息
        self.add_message("user", user_message)

        full_response = ""
        all_thinking = []
        iteration = 0

        while iteration < self.max_iterations:
            iteration += 1

            # 构建消息
            messages_to_send = self._build_messages()

            # 调用 LLM
            response_text, tool_calls = await self._call_llm(messages_to_send)

            # 提取思考内容
            thinking, content = self._extract_thinking(response_text)
            if thinking:
                all_thinking.append(thinking)
                if self.on_thinking:
                    await self.on_thinking(thinking)

            # 检查是否有工具调用
            if tool_calls:
                self.add_message("assistant", response_text)
                full_response += content if content else ""

                # 执行工具
                tool_results = []
                for tc in tool_calls:
                    if self.on_tool_call:
                        await self.on_tool_call(tc)

                    result = await self.tool_executor.execute_tool_call(tc)

                    # 构建工具结果消息
                    tool_result_content = json.dumps({
                        "success": result.success,
                        "result": result.result,
                        "error": result.error
                    }, ensure_ascii=False)

                    tool_msg = {
                        "role": "tool",
                        "tool_call_id": tc.get("id", f"tool_{len(tool_results)}"),
                        "content": tool_result_content
                    }
                    self.messages.append(tool_msg)
                    tool_results.append((tc, result))

                # 如果有内容输出，先发送
                if content and self.on_token:
                    await self.on_token(content)
            else:
                # 没有工具调用，这是最终响应
                self.add_message("assistant", response_text)
                full_response = content if content else response_text
                break

        return AgentResponse(
            content=full_response,
            state=AgentState.DONE,
            thinking="\n\n".join(all_thinking) if all_thinking else None,
            tool_calls=tool_calls if tool_calls else []
        )

    async def run_stream(self, user_message: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式运行 Agent 循环

        Yields:
            Dict: {
                "type": "thinking" | "token" | "tool_call" | "tool_result" | "done",
                "content": str,
                ...
            }
        """
        self.add_message("user", user_message)

        iteration = 0
        full_content = ""
        thinking_buffer = ""
        tool_calls_found = False

        while iteration < self.max_iterations:
            iteration += 1

            messages_to_send = self._build_messages()
            tool_calls_found = False

            # 根据提供商选择调用方式
            if self.llm_provider == "openai":
                async for event in self._call_openai_stream(messages_to_send):
                    if event["type"] == "thinking":
                        # 处理思考事件
                        if event.get("done"):
                            yield {"type": "thinking_end", "content": ""}
                        else:
                            thinking_content = event["content"]
                            yield {"type": "thinking", "content": thinking_content}
                    elif event["type"] == "token":
                        full_content += event["content"]
                        yield event
                    elif event["type"] == "tool_calls":
                        # 工具调用
                        tool_calls = event["content"]
                        self.add_message("assistant", full_content)

                        # 执行工具
                        for tc in tool_calls:
                            tool_name = tc.get("function", {}).get("name", "unknown")
                            tool_args = tc.get("function", {}).get("arguments", "{}")

                            # 提取文件路径（用于文件操作）
                            file_path = ""
                            try:
                                args_dict = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                                file_path = args_dict.get("path", args_dict.get("file_path", ""))
                            except:
                                pass

                            # 发送状态更新 - 开始执行工具
                            yield {"type": "status", "content": "preparing", "tool": tool_name, "message": f"Preparing {tool_name}..."}

                            try:
                                args_dict = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                                if len(str(args_dict)) > 200:
                                    args_display = {k: (v[:100] + "..." if isinstance(v, str) and len(v) > 100 else v)
                                                   for k, v in list(args_dict.items())[:3]}
                                else:
                                    args_display = args_dict
                                yield {"type": "thinking_step", "content": f"Calling tool: {tool_name}", "details": json.dumps(args_display, ensure_ascii=False)}
                            except Exception as e:
                                yield {"type": "thinking_step", "content": f"Calling tool: {tool_name}", "details": f"Parameter parsing failed: {str(e)}"}

                            yield {"type": "status", "content": "executing", "tool": tool_name, "message": f"Executing {tool_name}..."}
                            yield {"type": "tool_call", "content": tc}
                            result = await self.tool_executor.execute_tool_call(tc)

                            tool_msg = {
                                "role": "tool",
                                "tool_call_id": tc.get("id", ""),
                                "content": json.dumps({
                                    "success": result.success,
                                    "result": result.result,
                                    "error": result.error
                                }, ensure_ascii=False)
                            }
                            self.messages.append(tool_msg)
                            full_content = ""  # 重置
                            tool_calls_found = True

                            # 工具执行结果 - 对于写入类工具，流式显示内容
                            write_tools = ["Write", "write_file", "create_file", "edit_file"]
                            # 也检查 preview 字段
                            if (tool_name in write_tools and result.success and result.result) or result.preview:
                                # 使用 preview 中的信息
                                if result.preview:
                                    preview_info = result.preview
                                    file_name = preview_info.get("file_path", "").split("/")[-1] or file_path.split("/")[-1]
                                    language = preview_info.get("language", "text")
                                    content_to_show = preview_info.get("content", str(result.result))
                                    total_lines = preview_info.get("total_lines", content_to_show.count("\n") + 1)
                                    truncated = preview_info.get("truncated", False)
                                else:
                                    content_to_show = str(result.result)
                                    total_len = len(content_to_show)
                                    file_name = file_path.split("/")[-1] if file_path else "文件"
                                    ext = file_name.split(".")[-1].lower() if "." in file_name else ""
                                    lang_map = {
                                        "py": "python", "js": "javascript", "ts": "typescript",
                                        "html": "html", "css": "css", "json": "json",
                                        "md": "markdown", "java": "java", "cpp": "cpp",
                                        "go": "go", "rust": "rust", "sql": "sql",
                                        "sh": "bash", "yaml": "yaml", "yml": "yaml"
                                    }
                                    language = lang_map.get(ext, "text")
                                    total_lines = content_to_show.count("\n") + 1
                                    truncated = False

                                # Code block start
                                yield {"type": "code_block_start",
                                       "tool": tool_name,
                                       "file_path": preview_info.get("file_path", file_path) if result.preview else file_path,
                                       "file_name": file_name,
                                       "language": language,
                                       "total_lines": total_lines,
                                       "truncated": truncated}

                                # 发送写入状态
                                yield {"type": "status", "content": "writing", "tool": tool_name,
                                       "message": f"Writing file: {file_name}..."}

                                # 流式输出代码内容
                                for i in range(0, len(content_to_show), chunk_size):
                                    chunk = content_to_show[i:i+chunk_size]
                                    written = min(i + chunk_size, len(content_to_show))
                                    progress = min(int((written / len(content_to_show)) * 100), 100)
                                    yield {"type": "code_output", "content": chunk, "tool": tool_name,
                                           "progress": progress, "written": written, "total": len(content_to_show)}
                                    await asyncio.sleep(0.005)

                                # Code block end
                                yield {"type": "code_block_end",
                                       "tool": tool_name,
                                       "file_name": file_name,
                                       "total_lines": total_lines,
                                       "truncated": truncated}

                                yield {"type": "status", "content": "complete", "tool": tool_name,
                                       "message": f"Created {file_name}" + (" (preview)" if truncated else ""), "file_name": file_name}
                            else:
                                status_text = "Success" if result.success else "Failed"
                                yield {"type": "status", "content": "done", "tool": tool_name,
                                       "message": f"{status_text}: {tool_name}"}
                                yield {"type": "thinking_step", "content": f"{status_text}: {tool_name}", "result_summary": str(result.result)[:200] if result.result else result.error}
                            yield {"type": "tool_result", "content": result, "tool_call_id": tc.get("id", "")}
                        break  # 继续下一轮循环
                    elif event["type"] == "done":
                        self.add_message("assistant", full_content)
                        yield {"type": "done", "content": full_content}
                        return

                # 如果没有工具调用且有内容，完成
                if not tool_calls_found and full_content:
                    self.add_message("assistant", full_content)
                    yield {"type": "done", "content": full_content}
                    return

            elif self.llm_provider == "openai-compatible":
                # openai-compatible 使用 httpx 直接调用（非 SDK）
                async for event in self._call_openai_compatible_stream(messages_to_send):
                    if event["type"] == "thinking":
                        # 处理思考事件
                        if event.get("done"):
                            # 思考结束标记
                            yield {"type": "thinking_end", "content": ""}
                        else:
                            # 思考内容更新
                            thinking_content = event["content"]
                            yield {"type": "thinking", "content": thinking_content}
                    elif event["type"] == "token":
                        full_content += event["content"]
                        yield event
                    elif event["type"] == "tool_calls":
                        # 工具调用
                        tool_calls = event["content"]
                        self.add_message("assistant", full_content)

                        # 执行工具
                        for tc in tool_calls:
                            tool_name = tc.get("function", {}).get("name", "unknown")
                            tool_args = tc.get("function", {}).get("arguments", "{}")

                            # 提取文件路径
                            file_path = ""
                            try:
                                args_dict = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                                file_path = args_dict.get("path", args_dict.get("file_path", ""))
                            except:
                                pass

                            yield {"type": "status", "content": "executing", "tool": tool_name, "message": f"Executing {tool_name}..."}

                            try:
                                args_dict = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                                if len(str(args_dict)) > 200:
                                    args_display = {k: (v[:100] + "..." if isinstance(v, str) and len(v) > 100 else v)
                                                   for k, v in list(args_dict.items())[:3]}
                                else:
                                    args_display = args_dict
                                yield {"type": "thinking_step", "content": f"Calling tool: {tool_name}", "details": json.dumps(args_display, ensure_ascii=False)}
                            except:
                                yield {"type": "thinking_step", "content": f"Calling tool: {tool_name}", "details": ""}
                            yield {"type": "tool_call", "content": tc}
                            result = await self.tool_executor.execute_tool_call(tc)

                            tool_msg = {
                                "role": "tool",
                                "tool_call_id": tc.get("id", ""),
                                "content": json.dumps({
                                    "success": result.success,
                                    "result": result.result,
                                    "error": result.error
                                }, ensure_ascii=False)
                            }
                            self.messages.append(tool_msg)
                            full_content = ""  # 重置
                            tool_calls_found = True

                            # 工具执行结果 - 对于写入类工具，流式显示内容
                            write_tools = ["Write", "write_file", "create_file", "edit_file"]
                            # 也检查 preview 字段
                            if (tool_name in write_tools and result.success and result.result) or result.preview:
                                # 使用 preview 中的信息
                                if result.preview:
                                    preview_info = result.preview
                                    file_name = preview_info.get("file_path", "").split("/")[-1] or file_path.split("/")[-1]
                                    language = preview_info.get("language", "text")
                                    content_to_show = preview_info.get("content", str(result.result))
                                    total_lines = preview_info.get("total_lines", content_to_show.count("\n") + 1)
                                    truncated = preview_info.get("truncated", False)
                                else:
                                    content_to_show = str(result.result)
                                    total_len = len(content_to_show)
                                    file_name = file_path.split("/")[-1] if file_path else "文件"
                                    ext = file_name.split(".")[-1].lower() if "." in file_name else ""
                                    lang_map = {
                                        "py": "python", "js": "javascript", "ts": "typescript",
                                        "html": "html", "css": "css", "json": "json",
                                        "md": "markdown", "java": "java", "cpp": "cpp",
                                        "go": "go", "rust": "rust", "sql": "sql",
                                        "sh": "bash", "yaml": "yaml", "yml": "yaml"
                                    }
                                    language = lang_map.get(ext, "text")
                                    total_lines = content_to_show.count("\n") + 1
                                    truncated = False
                                # 发送代码块开始
                                yield {"type": "code_block_start",
                                       "tool": tool_name,
                                       "file_path": preview_info.get("file_path", file_path) if result.preview else file_path,
                                       "file_name": file_name,
                                       "language": language,
                                       "total_lines": total_lines,
                                       "truncated": truncated}
                                # 流式输出代码内容
                                chunk_size = 80
                                for i in range(0, len(content_to_show), chunk_size):
                                    chunk = content_to_show[i:i+chunk_size]
                                    written = min(i + chunk_size, len(content_to_show))
                                    progress = min(int((written / len(content_to_show)) * 100), 100)
                                    yield {"type": "code_output", "content": chunk, "tool": tool_name,
                                           "progress": progress, "written": written, "total": len(content_to_show)}
                                    await asyncio.sleep(0.005)
                                # 发送代码块结束
                                yield {"type": "code_block_end",
                                       "tool": tool_name,
                                       "file_name": file_name,
                                       "total_lines": total_lines,
                                       "truncated": truncated}
                                yield {"type": "status", "content": "complete", "tool": tool_name,
                                       "message": f"Created {file_name}" + (" (preview)" if truncated else ""), "file_name": file_name}
                            else:
                                status_text = "Success" if result.success else "Failed"
                                yield {"type": "status", "content": "done", "tool": tool_name,
                                       "message": f"{status_text}: {tool_name}"}
                                yield {"type": "thinking_step", "content": f"{status_text}: {tool_name}", "result_summary": str(result.result)[:200] if result.result else result.error}
                            yield {"type": "tool_result", "content": result, "tool_call_id": tc.get("id", "")}
                        break  # 继续下一轮循环
                    elif event["type"] == "done":
                        self.add_message("assistant", full_content)
                        yield {"type": "done", "content": full_content}
                        return

                # 如果没有工具调用且有内容，完成
                if not tool_calls_found and full_content:
                    self.add_message("assistant", full_content)
                    yield {"type": "done", "content": full_content}
                    return

            else:
                # 其他提供商使用非流式调用
                response_text, tool_calls = await self._call_llm(messages_to_send)
                thinking, content = self._extract_thinking(response_text)

                if thinking:
                    yield {"type": "thinking", "content": thinking}

                if content:
                    yield {"type": "token", "content": content}
                    full_content += content

                if tool_calls:
                    self.add_message("assistant", response_text)

                    for tc in tool_calls:
                        yield {"type": "tool_call", "content": tc}
                        result = await self.tool_executor.execute_tool_call(tc)

                        tool_msg = {
                            "role": "tool",
                            "tool_call_id": tc.get("id", ""),
                            "content": json.dumps({
                                "success": result.success,
                                "result": result.result,
                                "error": result.error
                            }, ensure_ascii=False)
                        }
                        self.messages.append(tool_msg)

                        yield {"type": "tool_result", "content": result, "tool_call_id": tc.get("id", "")}
                else:
                    self.add_message("assistant", response_text)
                    yield {"type": "done", "content": content or response_text}
                    return

        # 达到最大迭代次数
        if full_content:
            self.add_message("assistant", full_content)
        yield {"type": "error", "content": f"达到最大迭代次数 ({self.max_iterations})"}

    def _build_messages(self) -> List[Dict[str, Any]]:
        """构建发送给 LLM 的消息列表"""
        messages = []

        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})

        messages.extend(self.messages)

        return messages

    async def _call_llm(self, messages: List[Dict]) -> tuple:
        """调用 LLM（非流式）"""
        if self.llm_provider == "openai":
            return await self._call_openai(messages)
        elif self.llm_provider == "anthropic":
            return await self._call_anthropic(messages)
        elif self.llm_provider == "dashscope":
            return await self._call_dashscope(messages)
        elif self.llm_provider == "openai-compatible":
            return await self._call_openai_compatible(messages)
        else:
            raise ValueError(f"不支持的 LLM 提供商: {self.llm_provider}")

    async def _call_openai(self, messages: List[Dict]) -> tuple:
        """调用 OpenAI API"""
        from openai import AsyncOpenAI

        client_kwargs = {"api_key": self.api_key}
        if self.base_url:
            client_kwargs["base_url"] = self.base_url
        client = AsyncOpenAI(**client_kwargs)
        raw_tools = self.tool_executor.get_tools_definitions()
        tools = convert_to_openai_tools(raw_tools)

        response = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools if tools else None,
            tool_choice="auto",
            stream=False
        )

        msg = response.choices[0].message
        content = msg.content or ""
        tool_calls = []

        if msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append({
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                })

        return content, tool_calls

    async def _call_anthropic(self, messages: List[Dict]) -> tuple:
        """调用 Anthropic API"""
        # Anthropic 使用不同的格式
        raise NotImplementedError("Anthropic 支持待实现")

    async def _call_dashscope(self, messages: List[Dict]) -> tuple:
        """调用 DashScope API (通义千问)"""
        # 通义千问使用 function call
        raise NotImplementedError("DashScope 支持待实现")

    async def _call_openai_compatible(self, messages: List[Dict]) -> tuple:
        """调用 OpenAI 兼容 API"""
        import aiohttp

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        raw_tools = self.tool_executor.get_tools_definitions()
        tools = convert_to_openai_tools(raw_tools)

        data = {
            "model": self.model,
            "messages": messages,
            "tools": tools if tools else None,
            "tool_choice": "auto",
            "stream": False
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, headers=headers) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise Exception(f"API 错误: {resp.status} - {error}")

                result = await resp.json()
                msg = result["choices"][0]["message"]
                content = msg.get("content") or ""
                tool_calls = msg.get("tool_calls") or []

                return content, tool_calls

    async def _call_openai_stream(self, messages: List[Dict]) -> AsyncGenerator[Dict, None]:
        """调用 OpenAI 流式 API"""
        from openai import AsyncOpenAI

        client_kwargs = {"api_key": self.api_key}
        if self.base_url:
            client_kwargs["base_url"] = self.base_url
        client = AsyncOpenAI(**client_kwargs)
        
        raw_tools = self.tool_executor.get_tools_definitions()
        tools = convert_to_openai_tools(raw_tools)

        full_content = ""
        thinking_buffer = ""
        tool_calls_buffer = []
        in_thinking = False

        stream = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools if tools else None,
            tool_choice="auto",
            stream=True
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta

            # 内容
            if delta.content:
                full_content += delta.content

                # 处理思考内容
                if "[THINKING]" in delta.content:
                    parts = delta.content.split("[THINKING]")
                    if parts[0]:
                        yield {"type": "token", "content": parts[0]}
                    thinking_buffer = ""
                    in_thinking = True
                    # 检查是否有结束标记
                    remaining = parts[1] if len(parts) > 1 else ""
                    if "[/THINKING]" in remaining:
                        end_parts = remaining.split("[/THINKING]")
                        thinking_buffer += end_parts[0]
                        yield {"type": "thinking", "content": thinking_buffer}
                        thinking_buffer = ""
                        in_thinking = False
                        if len(end_parts) > 1:
                            yield {"type": "token", "content": end_parts[1]}
                    else:
                        thinking_buffer += remaining
                elif "[/THINKING]" in delta.content:
                    parts = delta.content.split("[/THINKING]")
                    thinking_buffer += parts[0]
                    yield {"type": "thinking", "content": thinking_buffer}
                    thinking_buffer = ""
                    in_thinking = False
                    if len(parts) > 1 and parts[1]:
                        yield {"type": "token", "content": parts[1]}
                elif in_thinking:
                    thinking_buffer += delta.content
                    yield {"type": "thinking", "content": thinking_buffer}
                else:
                    yield {"type": "token", "content": delta.content}

            # 工具调用
            if delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    if tc_delta.index is not None:
                        # 确保 buffer 有足够的空间
                        while len(tool_calls_buffer) <= tc_delta.index:
                            tool_calls_buffer.append({"id": "", "type": "function", "function": {"name": "", "arguments": ""}})

                        if tc_delta.id:
                            tool_calls_buffer[tc_delta.index]["id"] = tc_delta.id
                        if tc_delta.function:
                            if tc_delta.function.name:
                                tool_calls_buffer[tc_delta.index]["function"]["name"] = tc_delta.function.name
                            if tc_delta.function.arguments:
                                tool_calls_buffer[tc_delta.index]["function"]["arguments"] += tc_delta.function.arguments

        # 完成后发送工具调用
        if tool_calls_buffer:
            yield {"type": "tool_calls", "content": tool_calls_buffer}
        else:
            yield {"type": "done", "content": full_content}

    async def _call_openai_compatible_stream(self, messages: List[Dict]) -> AsyncGenerator[Dict, None]:
        """
        调用 OpenAI 兼容 API 的流式接口（如通义千问国际版）
        使用 httpx 直接调用，不依赖 OpenAI SDK
        """
        import httpx

        url = f"{self.base_url}/chat/completions" if self.base_url else "https://api.openai.com/v1/chat/completions"
        if not url.endswith("/chat/completions"):
            url = f"{url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        raw_tools = self.tool_executor.get_tools_definitions()
        tools = convert_to_openai_tools(raw_tools)

        # 构建请求数据
        data = {
            "model": self.model,
            "messages": messages,
            "tools": tools if tools else None,
            "tool_choice": "auto",
            "stream": True
        }

        # 检查是否是 Qwen 模型
        is_qwen_model = "qwen" in self.model.lower()
        if is_qwen_model:
            # Qwen3 模型：启用思考模式 - 尝试多种可能的格式
            if "qwen3" in self.model.lower() or "qwen2.5" in self.model.lower():
                # 同时设置多种可能的参数位置，确保至少一个生效
                # 格式1: parameters.thinking (某些版本)
                if "parameters" not in data:
                    data["parameters"] = {}
                data["parameters"]["thinking"] = True

                # 格式2: enable_thinking (顶层)
                data["enable_thinking"] = True

                # 格式3: thinking (顶层)
                data["thinking"] = True
            else:
                data["thinking"] = True

        full_content = ""
        thinking_buffer = ""
        tool_calls_buffer = []
        thinking_started = False
        thinking_ended = False
        thinking_content_delta = ""
        full_thinking_history = []  # 保存完整的思考历史

        try:
            # 禁用系统代理，避免 TLS 连接问题
            # httpx 0.23+ 使用环境变量或 Proxy 对象配置代理
            import os
            # 临时清除代理环境变量
            original_http_proxy = os.environ.pop('HTTP_PROXY', None)
            original_https_proxy = os.environ.pop('HTTPS_PROXY', None)
            original_http_proxy = os.environ.pop('http_proxy', original_http_proxy)
            original_https_proxy = os.environ.pop('https_proxy', original_https_proxy)

            async with httpx.AsyncClient(
                timeout=120.0,
                follow_redirects=True,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
                trust_env=False  # 禁用环境变量中的代理配置
            ) as client:
                async with client.stream("POST", url, headers=headers, json=data) as response:
                    response.raise_for_status()

                    last_data_time = asyncio.get_event_loop().time()
                    timeout_seconds = 30.  # 默认超时：30秒
                    fast_timeout = 5.  # thinking结束后快速超时：5秒

                    async for line in response.aiter_lines():
                        current_time = asyncio.get_event_loop().time()

                        if line.startswith("data: "):
                            last_data_time = current_time

                            # 动态调整超时：thinking结束且有工具调用时使用短超时
                            current_timeout = fast_timeout if (thinking_ended and tool_calls_buffer) else timeout_seconds

                            if line == "data: [DONE]":
                                if thinking_buffer and not thinking_ended:
                                    yield {"type": "thinking_end", "content": "", "full_history": "\n".join(full_thinking_history)}
                                    thinking_ended = True
                                break

                            try:
                                chunk = json.loads(line[6:])

                                if "choices" in chunk and len(chunk["choices"]) > 0:
                                    delta = chunk["choices"][0].get("delta", {})

                                    # 先获取普通内容
                                    content = delta.get("content") or ""

                                    # 尝试多种可能的 thinking 字段名（包括思考内容可能在 content 中以特定格式返回的情况）
                                    thinking_content = (
                                        delta.get("reasoning_content") or
                                        delta.get("thinking") or
                                        delta.get("thinking_content") or
                                        delta.get("reasoning") or
                                        delta.get("thought") or
                                        delta.get("Thoughts") or
                                        delta.get("thoughts") or
                                        delta.get("internal_thoughts") or
                                        ""
                                    )

                                    # 检查是否有工具调用（这会结束思考过程）
                                    has_tool_calls = delta.get("tool_calls") is not None

                                    # 检查 content 中是否包含 [THINKING] 标签格式的思考内容
                                    if "[THINKING]" in content:
                                        parts = content.split("[THINKING]")
                                        # [THINKING] 之前的内容作为普通内容发送
                                        if parts[0]:
                                            if thinking_buffer and not thinking_ended:
                                                yield {"type": "thinking_end", "content": "", "full_history": "\n".join(full_thinking_history)}
                                                thinking_ended = True
                                            full_content += parts[0]
                                            yield {"type": "token", "content": parts[0]}

                                        # 处理思考内容部分
                                        remaining = "[THINKING]".join(parts[1:])
                                        if "[/THINKING]" in remaining:
                                            end_parts = remaining.split("[/THINKING]")
                                            thinking_part = end_parts[0]
                                            thinking_buffer += thinking_part
                                            full_thinking_history.append(thinking_part)
                                            thinking_started = True
                                            thinking_ended = False
                                            yield {"type": "thinking", "content": thinking_buffer, "delta": True}

                                            # 思考结束
                                            yield {"type": "thinking_end", "content": "", "full_history": "\n".join(full_thinking_history)}
                                            thinking_ended = True
                                            thinking_buffer = ""

                                            # 思考之后的内容作为普通内容发送
                                            after_thinking = "[/THINKING]".join(end_parts[1:])
                                            if after_thinking:
                                                full_content += after_thinking
                                                yield {"type": "token", "content": after_thinking}
                                        else:
                                            # 思考内容还在继续
                                            thinking_buffer += remaining
                                            full_thinking_history.append(remaining)
                                            thinking_started = True
                                            yield {"type": "thinking", "content": thinking_buffer, "delta": True}
                                        continue

                                    # 处理纯思考内容（非 [THINKING] 标签格式）
                                    if thinking_content:
                                        # 增量更新思考内容
                                        thinking_content_delta += thinking_content
                                        thinking_buffer += thinking_content
                                        full_thinking_history.append(thinking_content)
                                        thinking_started = True
                                        # 发送完整的思考内容（累积）
                                        yield {"type": "thinking", "content": thinking_buffer, "delta": True}

                                    # 处理普通内容或工具调用
                                    if content or has_tool_calls:
                                        # 如果之前有思考内容，发送思考结束标记（但不清空历史）
                                        if thinking_buffer and not thinking_ended:
                                            print(f"[DEBUG] Sending thinking_end because content or tool_calls received")
                                            yield {"type": "thinking_end", "content": "", "full_history": "\n".join(full_thinking_history)}
                                            thinking_ended = True

                                        if content and not thinking_content:
                                            full_content += content
                                            yield {"type": "token", "content": content}

                                    # 处理 [THINKING] 标记（用于某些模型的文本格式）
                                    delta_str = str(delta)
                                    if "[THINKING]" in delta_str and not thinking_content:
                                        thinking_started = True
                                        thinking_ended = False

                                    if "[/THINKING]" in delta_str:
                                        if thinking_buffer and not thinking_ended:
                                            yield {"type": "thinking", "content": thinking_buffer, "done": True}
                                        thinking_buffer = ""
                                        thinking_started = False
                                        thinking_ended = True

                                    # 工具调用
                                    tool_calls_in_delta = delta.get("tool_calls")
                                    if tool_calls_in_delta:
                                        print(f"[DEBUG] Detected tool_calls in delta: {tool_calls_in_delta}")
                                        # 确保思考已结束
                                        if thinking_buffer and not thinking_ended:
                                            print(f"[DEBUG] Sending thinking_end before tool_calls")
                                            yield {"type": "thinking_end", "content": "", "full_history": "\n".join(full_thinking_history)}
                                            thinking_ended = True

                                        for tc_delta in tool_calls_in_delta:
                                            # 使用 get() 方法访问，因为是普通 dict 而非 SDK 对象
                                            tc_index = tc_delta.get("index")
                                            if tc_index is not None:
                                                while len(tool_calls_buffer) <= tc_index:
                                                    tool_calls_buffer.append({
                                                        "id": "",
                                                        "type": "function",
                                                        "function": {"name": "", "arguments": ""}
                                                    })

                                                if tc_delta.get("id"):
                                                    tool_calls_buffer[tc_index]["id"] = tc_delta.get("id")
                                                if tc_delta.get("function"):
                                                    func = tc_delta.get("function")
                                                    if func.get("name"):
                                                        tool_calls_buffer[tc_index]["function"]["name"] = func.get("name")
                                                    if func.get("arguments"):
                                                        tool_calls_buffer[tc_index]["function"]["arguments"] += func.get("arguments")

                            except json.JSONDecodeError as e:
                                continue

                        # 检查超时（使用动态超时）
                        if current_time - last_data_time > current_timeout:
                            if thinking_buffer and not thinking_ended:
                                yield {"type": "thinking_end", "content": "", "full_history": "\n".join(full_thinking_history)}
                                thinking_ended = True
                            break

        except Exception as e:
            import traceback
            traceback.print_exc()
            raise

        # 完成后发送工具调用或结束标记
        if tool_calls_buffer:
            yield {"type": "tool_calls", "content": tool_calls_buffer}
        else:
            yield {"type": "done", "content": full_content}
