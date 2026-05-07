import os
import json
import uuid
import asyncio
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict
import re
import sys

sys.path.insert(0, str(Path(__file__).parent))
from memory_store import memory_store

DATA_DIR = Path(__file__).parent.parent / "data"
MEMORY_DIR = DATA_DIR / "memory_files"
MEMORY_DIR.mkdir(parents=True, exist_ok=True)

MEMORY_INDEX_FILE = MEMORY_DIR / "MEMORY.md"
USER_MEMORY_DIR = MEMORY_DIR / "user"
USER_MEMORY_DIR.mkdir(parents=True, exist_ok=True)

MEMORY_CONFIG_FILE = DATA_DIR / "memory_config.json"

DEFAULT_TOKEN_THRESHOLD = 8000
DEFAULT_MESSAGE_COUNT_THRESHOLD = 20
DEFAULT_EXTRACT_INTERVAL = 5

def estimate_tokens(text: str) -> int:
    return len(text) // 4

class MemoryExtractor:
    def __init__(self):
        self._ensure_index()
        self._load_config()

    def _ensure_index(self):
        if not MEMORY_INDEX_FILE.exists():
            with open(MEMORY_INDEX_FILE, 'w', encoding='utf-8') as f:
                f.write("# Memory Index\n\n## User Preferences\n- (empty)\n\n## Session Summaries\n- (empty)\n\n## Project Knowledge\n- (empty)\n\n---\nLast updated: {}\n".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    def _load_config(self):
        if MEMORY_CONFIG_FILE.exists():
            with open(MEMORY_CONFIG_FILE, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        else:
            self.config = self._default_config()
            self._save_config()

    def _default_config(self) -> Dict:
        return {
            "token_threshold": DEFAULT_TOKEN_THRESHOLD,
            "message_count_threshold": DEFAULT_MESSAGE_COUNT_THRESHOLD,
            "extract_interval": DEFAULT_EXTRACT_INTERVAL,
            "last_extraction": {
                "conversation_id": None,
                "message_index": 0
            },
            "extraction_history": []
        }

    def _save_config(self):
        with open(MEMORY_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)

    def update_config(self, token_threshold: int = None, message_count_threshold: int = None, extract_interval: int = None):
        if token_threshold is not None:
            self.config["token_threshold"] = token_threshold
        if message_count_threshold is not None:
            self.config["message_count_threshold"] = message_count_threshold
        if extract_interval is not None:
            self.config["extract_interval"] = extract_interval
        self._save_config()

    def get_config(self) -> Dict:
        return {
            "token_threshold": self.config.get("token_threshold", DEFAULT_TOKEN_THRESHOLD),
            "message_count_threshold": self.config.get("message_count_threshold", DEFAULT_MESSAGE_COUNT_THRESHOLD),
            "extract_interval": self.config.get("extract_interval", DEFAULT_EXTRACT_INTERVAL)
        }

    def _get_user_memory_path(self, memory_id: str) -> Path:
        return USER_MEMORY_DIR / f"{memory_id}.md"

    def should_extract(self, messages: List[Dict], conversation_id: str = None) -> tuple[bool, str, int]:
        total_tokens = sum(estimate_tokens(m.get("content", "")) for m in messages)
        message_count = len(messages)

        last_extraction = self.config.get("last_extraction", {})
        last_conv_id = last_extraction.get("conversation_id")
        last_msg_index = last_extraction.get("message_index", 0)

        if conversation_id != last_conv_id:
            last_msg_index = 0

        new_messages = messages[last_msg_index:]
        new_tokens = sum(estimate_tokens(m.get("content", "")) for m in new_messages)
        new_message_count = len(new_messages)

        extract_interval = self.config.get("extract_interval", DEFAULT_EXTRACT_INTERVAL)

        if new_message_count >= extract_interval and new_tokens >= self.config.get("token_threshold", DEFAULT_TOKEN_THRESHOLD):
            return True, f"Token threshold exceeded ({new_tokens} >= {self.config.get('token_threshold', DEFAULT_TOKEN_THRESHOLD)})", last_msg_index

        if new_message_count >= extract_interval * 2:
            return True, f"Message count exceeded ({new_message_count} >= {extract_interval * 2})", last_msg_index

        return False, "", last_msg_index

    def extract_preferences(self, messages: List[Dict]) -> List[Dict]:
        preferences = []
        preference_keywords = ["喜欢", "偏好", "希望", "想要", "不要", "避免", "prefer", "like", "want", "avoid"]

        recent_messages = messages[-10:]

        for msg in recent_messages:
            content = msg.get("content", "").lower()

            for keyword in preference_keywords:
                if keyword.lower() in content:
                    sentences = re.split(r'[.。！!?\n]', content)
                    for sentence in sentences:
                        if keyword.lower() in sentence.lower():
                            if len(sentence.strip()) > 10 and len(sentence.strip()) < 200:
                                preferences.append({
                                    "content": sentence.strip(),
                                    "description": f"用户{keyword}相关偏好",
                                    "type": "preference",
                                    "tags": ["auto-extracted", "preference"],
                                    "confidence": 0.7
                                })
                    break

        return preferences[:5]

    def extract_knowledge(self, messages: List[Dict]) -> List[Dict]:
        knowledge_items = []
        code_blocks = []
        technical_terms = []

        for msg in messages:
            content = msg.get("content", "")

            code_pattern = r'```[\w]*\n([\s\S]*?)```'
            code_matches = re.findall(code_pattern, content)
            code_blocks.extend(code_matches)

            term_pattern = r'`([^`]+)`'
            terms = re.findall(term_pattern, content)
            technical_terms.extend(terms)

        if code_blocks:
            unique_code = list(set(code_blocks))[:3]
            for code in unique_code:
                if len(code) > 20:
                    knowledge_items.append({
                        "content": f"技术代码片段: {code[:100]}...",
                        "description": "使用的代码模式",
                        "type": "knowledge",
                        "tags": ["auto-extracted", "code-pattern"],
                        "confidence": 0.6
                    })

        if technical_terms:
            unique_terms = list(set(technical_terms))[:5]
            knowledge_items.append({
                "content": f"关键技术术语: {', '.join(unique_terms)}",
                "description": "项目技术栈相关",
                "type": "knowledge",
                "tags": ["auto-extracted", "technical-terms"],
                "confidence": 0.6
            })

        return knowledge_items

    def summarize_conversation(self, messages: List[Dict]) -> Dict:
        if not messages:
            return None

        total_tokens = sum(estimate_tokens(m.get("content", "")) for m in messages)
        user_messages = [m for m in messages if m.get("role") == "user"]
        assistant_messages = [m for m in messages if m.get("role") == "assistant"]

        first_msg = messages[0].get("content", "")[:100] if messages else ""
        last_msg = messages[-1].get("content", "")[:100] if messages else ""

        summary = {
            "content": f"对话摘要:\n- 共 {len(messages)} 条消息 ({len(user_messages)} 用户, {len(assistant_messages)} 助手)\n- 总 Token 约: {total_tokens}\n- 首条消息: {first_msg}...\n- 最后消息: {last_msg}...",
            "description": f"会话摘要 ({datetime.now().strftime('%Y-%m-%d')})",
            "type": "session",
            "tags": ["auto-extracted", "session-summary"],
            "confidence": 0.8
        }

        return summary

    def auto_extract(self, messages: List[Dict], conversation_id: str = None) -> List[Dict]:
        should, reason, last_index = self.should_extract(messages, conversation_id)
        if not should:
            return []

        new_messages = messages[last_index:]
        if not new_messages:
            return []

        extracted = []
        extracted.extend(self.extract_preferences(new_messages))
        extracted.extend(self.extract_knowledge(new_messages))

        summary = self.summarize_conversation(new_messages)
        if summary:
            extracted.append(summary)

        self.config["last_extraction"] = {
            "conversation_id": conversation_id,
            "message_index": len(messages)
        }
        self.config["extraction_history"].append({
            "timestamp": datetime.now().isoformat(),
            "conversation_id": conversation_id,
            "reason": reason,
            "items_extracted": len(extracted),
            "message_count": len(new_messages)
        })
        self._save_config()

        return extracted

    async def auto_extract_async(self, messages: List[Dict], conversation_id: str = None) -> List[Dict]:
        loop = asyncio.get_event_loop()
        extracted = await loop.run_in_executor(None, self.auto_extract, messages, conversation_id)

        for mem in extracted:
            memory_store.create_memory(
                content=mem["content"],
                description=mem["description"],
                memory_type=mem.get("type", "preference"),
                tags=mem.get("tags", []),
                confidence=mem.get("confidence", 0.8),
                conversation_id=conversation_id
            )

        return extracted

memory_extractor = MemoryExtractor()