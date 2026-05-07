import os
import re
import yaml
from pathlib import Path
from typing import List, Dict, Optional, Any


SKILLS_DIR = Path(__file__).parent / "skills"


def get_skills_list() -> List[Dict[str, Any]]:
    if not SKILLS_DIR.exists():
        return []

    skills = []
    for skill_dir in SKILLS_DIR.iterdir():
        if not skill_dir.is_dir():
            continue

        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            continue

        try:
            with open(skill_md, "r", encoding="utf-8") as f:
                content = f.read()

            metadata = parse_skill_metadata(content)

            skills.append({
                "id": skill_dir.name,
                "name": metadata.get("name", skill_dir.name),
                "description": metadata.get("description", ""),
                "allowed_tools": metadata.get("allowed-tools", []),
                "effort": metadata.get("effort", "medium"),
            })
        except Exception as e:
            print(f"[Skill Service] Error reading skill {skill_dir.name}: {e}")
            continue

    return skills


def get_skill_content(skill_id: str) -> Optional[str]:
    skill_dir = SKILLS_DIR / skill_id
    if not skill_dir.exists() or not skill_dir.is_dir():
        return None

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return None

    try:
        with open(skill_md, "r", encoding="utf-8") as f:
            content = f.read()

        return extract_markdown_body(content)
    except Exception as e:
        print(f"[Skill Service] Error reading skill content {skill_id}: {e}")
        return None


def parse_skill_metadata(content: str) -> Dict[str, Any]:
    metadata = {}

    yaml_match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if yaml_match:
        try:
            metadata = yaml.safe_load(yaml_match.group(1)) or {}
        except Exception:
            pass

    return metadata


def extract_markdown_body(content: str) -> str:
    yaml_match = re.match(r"^---\n.*?\n---\n*", content, re.DOTALL)
    if yaml_match:
        body = content[yaml_match.end():].strip()
        return body

    return content.strip()
