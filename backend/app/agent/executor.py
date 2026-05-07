"""
工具执行器 - 统一管理所有工具的执行
"""

import json
import asyncio
from typing import Dict, Any, Optional

# 使用绝对导入
from tools.base import BaseTool, ToolResult
from tools.registry import get_registry


class ToolExecutor:
    """统一执行工具调用的执行器"""

    def __init__(self, allowed_tools: Optional[list] = None):
        """
        Args:
            allowed_tools: 允许使用的工具列表，None 表示允许所有工具
        """
        self.registry = get_registry()
        self.allowed_tools = allowed_tools

    def is_tool_allowed(self, tool_name: str) -> bool:
        """检查工具是否允许使用"""
        if self.allowed_tools is None:
            return True
        return tool_name in self.allowed_tools

    async def execute(self, tool_name: str, arguments: Dict[str, Any]) -> ToolResult:
        """
        执行单个工具调用

        Args:
            tool_name: 工具名称
            arguments: 工具参数

        Returns:
            ToolResult: 执行结果
        """
        if not self.is_tool_allowed(tool_name):
            return ToolResult(
                success=False,
                error=f"工具 '{tool_name}' 不在允许列表中"
            )

        tool = self.registry.get(tool_name)
        if tool is None:
            return ToolResult(
                success=False,
                error=f"未找到工具: {tool_name}"
            )

        print(f"[ToolExecutor] Executing: {tool_name} with args: {json.dumps(arguments, ensure_ascii=False)[:200]}")

        try:
            result = await tool.execute(**arguments)
            print(f"[ToolExecutor] Result: success={result.success}")
            return result
        except Exception as e:
            print(f"[ToolExecutor] Error: {e}")
            return ToolResult(success=False, error=str(e))

    async def execute_tool_call(self, tool_call: Dict[str, Any]) -> ToolResult:
        """
        执行 tool_call 格式的调用（OpenAI 格式）

        Args:
            tool_call: {
                "id": "call_xxx",
                "type": "function",
                "function": {
                    "name": "tool_name",
                    "arguments": "{}"
                }
            }
        """
        tool_name = tool_call.get("function", {}).get("name", "")
        arguments_str = tool_call.get("function", {}).get("arguments", "{}")

        try:
            arguments = json.loads(arguments_str)
        except json.JSONDecodeError:
            return ToolResult(success=False, error=f"无效的 arguments JSON: {arguments_str}")

        return await self.execute(tool_name, arguments)

    def get_tools_definitions(self) -> list:
        """获取所有可用工具的定义（用于 API 调用）"""
        # list_tools() 返回的是定义字典列表
        definitions = self.registry.list_tools()
        if self.allowed_tools is None:
            return definitions
        # 过滤
        return [d for d in definitions if d.get("name") in self.allowed_tools]

    def get_tools_description(self) -> str:
        """获取工具描述（用于 system prompt）"""
        descriptions = []
        for tool_def in self.registry.list_tools():
            name = tool_def.get("name", "")
            if self.allowed_tools and name not in self.allowed_tools:
                continue
            desc = f"- **{name}**: {tool_def.get('description', '')}"
            schema = tool_def.get("input_schema", {})
            if schema.get("properties"):
                props = list(schema["properties"].keys())
                desc += f" (参数: {', '.join(props)})"
            descriptions.append(desc)
        return "\n".join(descriptions)
