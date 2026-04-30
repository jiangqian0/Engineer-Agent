"""
Engineer Agent Skills Module
This module contains all available skills for the Engineer Agent.
Skills are discoverable and can be loaded dynamically.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional

SKILLS_DIR = Path(__file__).parent

class Skill:
    def __init__(self, skill_dir: Path):
        self.dir = skill_dir
        self.name = skill_dir.name
        self.metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict:
        metadata_file = self.dir / "metadata.yaml"
        skill_file = self.dir / "SKILL.md"
        
        metadata = {
            "name": self.name,
            "description": "",
            "enabled": True
        }
        
        # Try to load from metadata.yaml
        if metadata_file.exists():
            import yaml
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata.update(yaml.safe_load(f))
            except:
                pass
        
        # Try to load from SKILL.md frontmatter
        elif skill_file.exists():
            try:
                with open(skill_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if content.startswith('---'):
                        lines = content.split('\n')
                        frontmatter_lines = []
                        i = 1
                        while i < len(lines) and lines[i].strip() != '---':
                            frontmatter_lines.append(lines[i])
                            i += 1
                        if frontmatter_lines:
                            import yaml
                            try:
                                fm = yaml.safe_load('\n'.join(frontmatter_lines))
                                if fm:
                                    metadata.update(fm)
                            except:
                                pass
            except:
                pass
        
        return metadata
    
    @property
    def description(self) -> str:
        return self.metadata.get("description", "")
    
    @property
    def enabled(self) -> bool:
        return self.metadata.get("enabled", True)
    
    def get_content(self) -> Optional[str]:
        skill_file = self.dir / "SKILL.md"
        if skill_file.exists():
            with open(skill_file, 'r', encoding='utf-8') as f:
                return f.read()
        return None

def discover_skills() -> List[Skill]:
    """Discover all available skills in the skills directory"""
    skills = []
    
    for item in SKILLS_DIR.iterdir():
        if item.is_dir():
            skill_file = item / "SKILL.md"
            if skill_file.exists():
                skills.append(Skill(item))
    
    return skills

def get_skill(name: str) -> Optional[Skill]:
    """Get a specific skill by name"""
    skill_dir = SKILLS_DIR / name
    if skill_dir.exists() and skill_dir.is_dir():
        skill = Skill(skill_dir)
        if (skill_dir / "SKILL.md").exists():
            return skill
    return None

__all__ = ['Skill', 'discover_skills', 'get_skill']
