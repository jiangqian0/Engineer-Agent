# Engineer Agent Skills

## Overview

The Skills system allows users to extend the Engineer Agent's capabilities by adding custom skills. Each skill is a self-contained module that provides specific functionality.

## Skill Structure

Each skill is a directory containing:

```
skill-name/
├── SKILL.md           # Main skill definition and instructions
├── metadata.yaml      # Optional metadata
└── [templates/...     # Optional template files]
```

## Creating a New Skill

1. **Create a new directory** in the `skills/` folder
2. **Add `SKILL.md`** with your skill's instructions
3. **Add `metadata.yaml`** (optional but recommended)
4. **Add any template files** (optional)

See `SKILL_TEMPLATE.md` for a detailed guide.

## Example Skill

Check out the `example-skill/` directory for a complete example.

## Skill Discovery

Skills are automatically discovered by the Engineer Agent. Any directory in the `skills/` folder containing a `SKILL.md` file will be treated as a skill.

## Skill Metadata

Skills can have metadata defined in either:
- Frontmatter in `SKILL.md`
- `metadata.yaml`

See `SKILL_TEMPLATE.md` for metadata options.
