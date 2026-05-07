import re
import glob as glob_module
from pathlib import Path
from typing import List, Optional
from .base import BaseTool, ToolResult


class GlobTool(BaseTool):
    name = "Glob"
    description = "搜索匹配模式的所有文件。用于查找文件时使用。参数：pattern (glob模式，如 **/*.py), cwd (可选，搜索目录)"
    input_schema = {
        "type": "object",
        "properties": {
            "pattern": {
                "type": "string",
                "description": "Glob模式，如 **/*.py, **/*.js, src/**/*.tsx"
            },
            "cwd": {
                "type": "string",
                "description": "搜索的根目录（可选，默认为当前目录）"
            }
        },
        "required": ["pattern"]
    }

    async def execute(self, pattern: str, cwd: Optional[str] = None, **kwargs) -> ToolResult:
        try:
            base_dir = Path(cwd) if cwd else Path.cwd()

            matches = list(base_dir.glob(pattern))

            files = [
                {
                    "path": str(m.relative_to(base_dir)),
                    "name": m.name,
                    "is_dir": m.is_dir()
                }
                for m in matches
            ]

            return ToolResult(
                success=True,
                result={
                    "count": len(files),
                    "files": files[:100]
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GrepTool(BaseTool):
    name = "Grep"
    description = "在文件中搜索匹配文本。用于查找代码或文本时使用。参数：pattern (正则表达式), file_path (文件路径，可选), cwd (可选，搜索目录)"
    input_schema = {
        "type": "object",
        "properties": {
            "pattern": {
                "type": "string",
                "description": "要搜索的正则表达式或文本"
            },
            "file_path": {
                "type": "string",
                "description": "要在哪个文件中搜索（可选，不填则搜索所有文件）"
            },
            "cwd": {
                "type": "string",
                "description": "搜索的根目录（可选）"
            },
            "max_results": {
                "type": "integer",
                "description": "最大返回结果数（默认50）"
            }
        },
        "required": ["pattern"]
    }

    async def execute(
        self,
        pattern: str,
        file_path: Optional[str] = None,
        cwd: Optional[str] = None,
        max_results: int = 50,
        **kwargs
    ) -> ToolResult:
        try:
            base_dir = Path(cwd) if cwd else Path.cwd()

            regex = re.compile(pattern)
            matches = []

            if file_path:
                files_to_search = [base_dir / file_path]
            else:
                files_to_search = list(base_dir.rglob("*"))
                files_to_search = [f for f in files_to_search if f.is_file()]

            for file_path in files_to_search[:500]:
                try:
                    if file_path.stat().st_size > 1024 * 1024:
                        continue

                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line_num, line in enumerate(f, 1):
                            if regex.search(line):
                                matches.append({
                                    "file": str(file_path.relative_to(base_dir)),
                                    "line": line_num,
                                    "content": line.rstrip()
                                })
                                if len(matches) >= max_results:
                                    break
                except Exception:
                    continue

                if len(matches) >= max_results:
                    break

            return ToolResult(
                success=True,
                result={
                    "count": len(matches),
                    "matches": matches
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))
