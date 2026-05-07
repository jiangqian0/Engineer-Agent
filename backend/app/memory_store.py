import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict
from fastapi import HTTPException

DATA_DIR = Path(__file__).parent.parent / "data"
MEMORY_DIR = DATA_DIR / "memory_files"
MEMORY_DIR.mkdir(parents=True, exist_ok=True)

MEMORY_INDEX_FILE = MEMORY_DIR / "MEMORY.md"
USER_MEMORY_DIR = MEMORY_DIR / "user"
USER_MEMORY_DIR.mkdir(parents=True, exist_ok=True)

class MemoryStore:
    def __init__(self):
        self._ensure_index()

    def _ensure_index(self):
        if not MEMORY_INDEX_FILE.exists():
            with open(MEMORY_INDEX_FILE, 'w', encoding='utf-8') as f:
                f.write("# Memory Index\n\n## User Preferences\n- (empty)\n\n## Session Summaries\n- (empty)\n\n---\nLast updated: {}\n".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    def _get_user_memory_path(self, memory_id: str) -> Path:
        return USER_MEMORY_DIR / f"{memory_id}.md"

    def create_memory(
        self,
        content: str,
        description: str,
        memory_type: str = "preference",
        tags: List[str] = None,
        confidence: float = 0.8,
        conversation_id: str = None
    ) -> Dict:
        memory_id = str(uuid.uuid4())[:8]
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        memory_data = {
            "name": memory_id,
            "description": description,
            "type": memory_type,
            "created_at": now,
            "updated_at": now,
            "tags": tags or [],
            "confidence": confidence,
            "conversation_id": conversation_id
        }

        md_content = "---\n"
        for key, value in memory_data.items():
            md_content += f"{key}: {value}\n"
        md_content += "---\n\n"
        md_content += content

        memory_path = self._get_user_memory_path(memory_id)
        with open(memory_path, 'w', encoding='utf-8') as f:
            f.write(md_content)

        self._update_index(memory_id, description, memory_type)

        return memory_data

    def _update_index(self, memory_id: str, description: str, memory_type: str):
        if not MEMORY_INDEX_FILE.exists():
            self._ensure_index()

        with open(MEMORY_INDEX_FILE, 'r', encoding='utf-8') as f:
            content = f.read()

        section = "## User Preferences" if memory_type == "preference" else "## Session Summaries"

        new_entry = f"- [{memory_id}](user/{memory_id}.md) — {description}\n"

        if f"- [{memory_id}]" in content:
            return

        lines = content.split('\n')
        in_section = False
        new_lines = []
        for line in lines:
            if line.startswith(section):
                in_section = True
            elif in_section and line.startswith('## ') and line != section:
                in_section = False
            if in_section and line == "- (empty)":
                new_lines.append(new_entry)
                continue
            new_lines.append(line)

        with open(MEMORY_INDEX_FILE, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))

    def get_memory(self, memory_id: str) -> Optional[Dict]:
        memory_path = self._get_user_memory_path(memory_id)
        if not memory_path.exists():
            return None

        with open(memory_path, 'r', encoding='utf-8') as f:
            content = f.read()

        frontmatter = {}
        body = content

        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                for line in parts[1].strip().split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        frontmatter[key.strip()] = value.strip()
                body = parts[2].strip()

        return {
            "id": memory_id,
            "content": body,
            **frontmatter
        }

    def list_memories(self, memory_type: Optional[str] = None, conversation_id: str = None) -> List[Dict]:
        memories = []

        if not USER_MEMORY_DIR.exists():
            return memories

        for md_file in USER_MEMORY_DIR.glob("*.md"):
            memory = self.get_memory(md_file.stem)
            if memory:
                if memory_type is not None and memory.get("type") != memory_type:
                    continue
                if conversation_id is not None and memory.get("conversation_id") != conversation_id:
                    continue
                memories.append(memory)

        return sorted(memories, key=lambda x: x.get("updated_at", ""), reverse=True)

    def delete_memory(self, memory_id: str) -> bool:
        memory_path = self._get_user_memory_path(memory_id)
        if not memory_path.exists():
            return False

        memory_path.unlink()

        with open(MEMORY_INDEX_FILE, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = [line for line in content.split('\n') if f"[{memory_id}]" not in line]

        with open(MEMORY_INDEX_FILE, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        return True

    def search_memories(self, query: str, limit: int = 5) -> List[Dict]:
        results = []
        for memory in self.list_memories():
            content = memory.get("content", "").lower()
            description = memory.get("description", "").lower()
            if query.lower() in content or query.lower() in description:
                results.append(memory)

        return results[:limit]

    def export_memories(self, format: str = "json", memory_ids: List[str] = None) -> Dict:
        if memory_ids:
            memories = [self.get_memory(mid) for mid in memory_ids if self.get_memory(mid)]
        else:
            memories = self.list_memories()

        if format == "json":
            return {
                "version": "1.0",
                "exported_at": datetime.now().isoformat(),
                "count": len(memories),
                "memories": memories
            }
        elif format == "markdown":
            lines = ["# Exported Memories\n"]
            lines.append(f"Exported at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            lines.append(f"Total: {len(memories)} memories\n")
            lines.append("---\n")

            for memory in memories:
                lines.append(f"## [{memory.get('name', 'unnamed')}] {memory.get('description', '')}\n")
                lines.append(f"- **Type**: {memory.get('type', 'unknown')}")
                lines.append(f"- **Created**: {memory.get('created_at', 'unknown')}")
                lines.append(f"- **Tags**: {', '.join(memory.get('tags', []))}\n")
                lines.append(f"### Content\n{memory.get('content', '')}\n")
                lines.append("---\n")

            return {"format": "markdown", "content": "\n".join(lines)}

        return {"error": "Unsupported format"}

    def import_memories(self, data: Dict, format: str = "json") -> List[Dict]:
        imported = []

        if format == "json":
            memories = data.get("memories", [])
        elif format == "markdown":
            memories = self._parse_markdown_memories(data.get("content", ""))
        else:
            return []

        for mem_data in memories:
            try:
                result = self.create_memory(
                    content=mem_data.get("content", mem_data.get("content", "")),
                    description=mem_data.get("description", "Imported memory"),
                    memory_type=mem_data.get("type", "preference"),
                    tags=mem_data.get("tags", []),
                    confidence=mem_data.get("confidence", 0.8)
                )
                imported.append(result)
            except Exception as e:
                print(f"Failed to import memory: {e}")

        return imported

    def _parse_markdown_memories(self, content: str) -> List[Dict]:
        memories = []
        sections = content.split("## [")

        for section in sections[1:]:
            parts = section.split("\n", 1)
            if len(parts) < 2:
                continue

            name_part = parts[0].split("]")[0] if "]" in parts[0] else "unnamed"
            desc_part = parts[0].split("]")[1].strip() if "]" in parts[0] else ""

            body = parts[1] if len(parts) > 1 else ""

            memories.append({
                "name": name_part,
                "description": desc_part,
                "content": body,
                "type": "preference",
                "tags": ["imported"],
                "confidence": 0.8
            })

        return memories

    def get_memories_for_context(self, limit: int = 10) -> str:
        memories = self.list_memories()[:limit]

        if not memories:
            return ""

        context_parts = ["\n## Relevant Memories\n"]

        for memory in memories:
            context_parts.append(f"- **{memory.get('description', 'Memory')}** ({memory.get('type', 'info')}): {memory.get('content', '')[:200]}")

        return "\n".join(context_parts)

memory_store = MemoryStore()
