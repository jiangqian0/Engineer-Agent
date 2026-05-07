import subprocess
import os
from pathlib import Path
from typing import Optional, List
from .base import BaseTool, ToolResult


class BashTool(BaseTool):
    name = "Bash"
    description = "执行终端命令。用于运行脚本、安装依赖、执行构建等操作。参数：command (命令字符串), cwd (可选，工作目录)"
    input_schema = {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "要执行的命令"
            },
            "cwd": {
                "type": "string",
                "description": "工作目录（可选）"
            }
        },
        "required": ["command"]
    }

    ALLOWED_COMMANDS = [
        "python", "pip", "npm", "node", "git", "mkdir", "rm", "cp", "mv",
        "ls", "dir", "cd", "type", "echo", "cat", "find", "grep", "curl",
        "uvicorn", "fastapi", "pytest", "black", "ruff", "prettier",
    ]

    BLOCKED_PATTERNS = [
        "rm -rf /", "del /f /q /s", "format c:",
        "shutdown", "restart", "init 0", "mkfs",
        "wget", "curl -O", ":(){:|:&};:", "nc ", "netcat",
    ]

    async def execute(self, command: str, cwd: Optional[str] = None, **kwargs) -> ToolResult:
        try:
            if self._is_dangerous(command):
                return ToolResult(
                    success=False,
                    error="危险命令已阻止：命令包含不允许的操作"
                )

            work_dir = cwd if cwd else os.getcwd()

            result = subprocess.run(
                command,
                shell=True,
                cwd=work_dir,
                capture_output=True,
                text=True,
                timeout=120,
                encoding="utf-8",
                errors="replace"
            )

            output = ""
            if result.stdout:
                output += f"[STDOUT]\n{result.stdout}"
            if result.stderr:
                output += f"\n[STDERR]\n{result.stderr}"
            if not output:
                output = "(命令执行完成，无输出)"

            return ToolResult(
                success=result.returncode == 0,
                result={
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "output": output
                }
            )
        except subprocess.TimeoutExpired:
            return ToolResult(success=False, error="命令执行超时（120秒）")
        except Exception as e:
            return ToolResult(success=False, error=str(e))

    def _is_dangerous(self, command: str) -> bool:
        cmd_lower = command.lower()

        for pattern in self.BLOCKED_PATTERNS:
            if pattern.lower() in cmd_lower:
                return True

        if "|" in command or "&" in command or ";" in command:
            parts = command.replace("|", " ").replace("&", " ").replace(";", " ").split()
            for part in parts:
                cmd_name = part.split()[0] if part.split() else ""
                if cmd_name not in self.ALLOWED_COMMANDS and cmd_name:
                    if not cmd_name.startswith("-"):
                        return True

        return False
