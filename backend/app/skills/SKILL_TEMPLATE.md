# Skill Creation Guide

## How to Create a New Skill

### Step 1: Create Skill Directory

Create a new directory for your skill in the `skills/` folder:

```
skills/
└── your-skill-name/
    ├── SKILL.md
    └── metadata.yaml
    └── [other files...
```

### Step 2: Create SKILL.md

The `SKILL.md` file is the main file that defines your skill.

```markdown
---
name: your-skill-name
description: Description of what this skill does
license: MIT
---

# Your Skill Name

Describe your skill here.

## When to Use This Skill

- List use case 1
- List use case 2

## How to Use

Provide detailed instructions.

### Step 1: ...
### Step 2: ...
```

### Step 3: Create metadata.yaml (Optional but Recommended)

```yaml
name: your-skill-name
description: Description of what this skill does
version: "1.0.0"
author: Your Name
enabled: true
category: Your Category
tags:
  - tag1
  - tag2
```

### Step 4: Add Templates and Additional Files (Optional)

Add any templates, scripts, or other resources your skill needs.

## Skill Loading

Skills are automatically discovered and loaded by the Engineer Agent when they are in the `skills/` directory.
