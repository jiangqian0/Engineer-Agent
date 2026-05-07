import os
import re
from pathlib import Path
from typing import Optional
from datetime import datetime
from .base import BaseTool, ToolResult

# 工作空间目录
WORKSPACE_DIR = Path(__file__).parent.parent.parent / "workspace"
# 项目文件夹目录
PROJECTS_DIR = WORKSPACE_DIR / "projects"

# 当前会话的项目文件夹（会话结束后清空）
_current_project_folder: Optional[Path] = None


def get_current_project_folder(project_hint: str = None) -> Path:
    """获取或创建当前项目文件夹"""
    global _current_project_folder
    if _current_project_folder is None:
        # 创建带时间戳的项目文件夹
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # 如果有项目提示，尝试生成简短的项目名
        if project_hint:
            # 清理项目名称（取前20个字符，去除特殊字符）
            safe_name = re.sub(r'[^\w\u4e00-\u9fff-]', '_', project_hint)[:20]
            safe_name = safe_name.strip('_')
            if safe_name:
                folder_name = f"{timestamp}_{safe_name}"
            else:
                folder_name = timestamp
        else:
            folder_name = timestamp

        _current_project_folder = PROJECTS_DIR / folder_name
        _current_project_folder.mkdir(parents=True, exist_ok=True)

    return _current_project_folder


def reset_project_folder():
    """重置当前项目文件夹（新会话开始时调用）"""
    global _current_project_folder
    _current_project_folder = None


def get_workspace_path(file_path: str) -> Path:
    """将相对路径转换为工作空间中的绝对路径"""
    path = Path(file_path)
    if path.is_absolute():
        # 确保路径在工作空间内（安全检查）
        resolved = path.resolve()
        workspace_resolved = WORKSPACE_DIR.resolve()
        if not str(resolved).startswith(str(workspace_resolved)):
            raise ValueError(f"路径必须在工作空间内: {file_path}")
        return path
    else:
        return WORKSPACE_DIR / path


class ReadTool(BaseTool):
    name = "Read"
    description = "读取文件内容。用于查看文件时使用。参数：file_path (文件路径，相对路径或 workspace/ 开头的路径)"
    input_schema = {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "要读取的文件路径（建议使用 workspace/ 开头的相对路径）"
            }
        },
        "required": ["file_path"]
    }

    async def execute(self, file_path: str, **kwargs) -> ToolResult:
        try:
            # 支持 workspace/ 开头的路径
            if file_path.startswith("workspace/") or file_path.startswith("workspace\\"):
                file_path = file_path[10:]
            elif not Path(file_path).is_absolute():
                # 相对路径，添加到工作空间
                file_path = str(WORKSPACE_DIR / file_path)

            path = Path(file_path)

            # 安全检查：确保路径在工作空间内
            resolved = path.resolve()
            workspace_resolved = WORKSPACE_DIR.resolve()
            if not str(resolved).startswith(str(workspace_resolved)):
                return ToolResult(success=False, error=f"路径必须在工作空间内: {file_path}")

            if not path.exists():
                return ToolResult(success=False, error=f"文件不存在: {file_path}")
            if not path.is_file():
                return ToolResult(success=False, error=f"不是文件: {file_path}")

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            return ToolResult(success=True, result=content)
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class WriteTool(BaseTool):
    name = "Write"
    description = "创建或覆盖文件内容。用于写入文件时使用。参数：file_path (文件路径), content (文件内容)。所有文件默认创建在 workspace/projects/ 目录下的当前项目文件夹中"
    input_schema = {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "要写入的文件路径（相对于项目文件夹的路径）"
            },
            "content": {
                "type": "string",
                "description": "文件内容"
            }
        },
        "required": ["file_path", "content"]
    }

    async def execute(self, file_path: str, content: str, **kwargs) -> ToolResult:
        try:
            # 获取当前项目文件夹
            project_folder = get_current_project_folder()

            # 支持 workspace/ 开头的路径
            if file_path.startswith("workspace/") or file_path.startswith("workspace\\"):
                file_path = file_path[10:]

            # 使用项目文件夹作为基础路径
            if not Path(file_path).is_absolute():
                path = project_folder / file_path
            else:
                path = Path(file_path)

            # 安全检查：确保路径在工作空间内
            resolved = path.resolve()
            workspace_resolved = WORKSPACE_DIR.resolve()
            if not str(resolved).startswith(str(workspace_resolved)):
                return ToolResult(success=False, error=f"路径必须在工作空间内: {file_path}")

            # 确保父目录存在
            path.parent.mkdir(parents=True, exist_ok=True)

            # 生成代码预览（取前50行）
            lines = content.split('\n')
            preview_lines = min(50, len(lines))
            preview_content = '\n'.join(lines[:50])
            preview = {
                "file_path": file_path,
                "language": self._detect_language(file_path),
                "content": preview_content,
                "total_lines": len(lines),
                "truncated": len(lines) > 50
            }

            with open(path, "w", encoding="utf-8") as f:
                f.write(content)

            # 返回相对于 workspace 的路径
            rel_path = str(path.relative_to(WORKSPACE_DIR))
            return ToolResult(
                success=True,
                result=f"文件已写入 workspace/{rel_path}",
                preview=preview
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))

    def _detect_language(self, file_path: str) -> str:
        """根据文件扩展名检测语言"""
        ext = Path(file_path).suffix.lower()
        lang_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'jsx',
            '.ts': 'typescript',
            '.tsx': 'tsx',
            '.html': 'html',
            '.css': 'css',
            '.json': 'json',
            '.md': 'markdown',
            '.sql': 'sql',
            '.sh': 'bash',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml',
        }
        return lang_map.get(ext, 'text')


class EditTool(BaseTool):
    name = "Edit"
    description = "编辑文件的部分内容。用于修改文件时使用。参数：file_path (文件路径), old_str (要替换的文本), new_str (新文本)。文件必须在项目文件夹中"
    input_schema = {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "要编辑的文件路径（相对于项目文件夹的路径）"
            },
            "old_str": {
                "type": "string",
                "description": "要替换的原始文本（必须精确匹配）"
            },
            "new_str": {
                "type": "string",
                "description": "替换后的新文本"
            }
        },
        "required": ["file_path", "old_str", "new_str"]
    }

    async def execute(self, file_path: str, old_str: str, new_str: str, **kwargs) -> ToolResult:
        try:
            # 获取当前项目文件夹
            project_folder = get_current_project_folder()

            # 支持 workspace/ 开头的路径
            if file_path.startswith("workspace/") or file_path.startswith("workspace\\"):
                file_path = file_path[10:]

            # 使用项目文件夹作为基础路径
            if not Path(file_path).is_absolute():
                path = project_folder / file_path
            else:
                path = Path(file_path)

            # 安全检查：确保路径在工作空间内
            resolved = path.resolve()
            workspace_resolved = WORKSPACE_DIR.resolve()
            if not str(resolved).startswith(str(workspace_resolved)):
                return ToolResult(success=False, error=f"路径必须在工作空间内: {file_path}")

            if not path.exists():
                return ToolResult(success=False, error=f"文件不存在: {file_path}")

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            if old_str not in content:
                return ToolResult(
                    success=False,
                    error=f"未找到要替换的文本: {old_str[:50]}..."
                )

            new_content = content.replace(old_str, new_str)

            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)

            rel_path = str(path.relative_to(WORKSPACE_DIR))
            return ToolResult(success=True, result=f"文件已编辑: workspace/{rel_path}")
        except Exception as e:
            return ToolResult(success=False, error=str(e))
