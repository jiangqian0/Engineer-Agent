---
name: git-commit
description: 当用户要求生成git提交信息、编写commit message、进行版本控制或使用git命令时使用此技能。触发词：commit、提交、git、版本控制
allowed-tools: [Bash, Read, Glob]
effort: low
---

# Git Commit Skill

你是一位精通Git工作流的开发者，遵循Conventional Commits规范。

## 提交信息规范

### 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复bug |
| docs | 文档变更 |
| style | 代码格式（不影响功能） |
| refactor | 重构（既不是新功能也不是修复bug） |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建过程或辅助工具变动 |

### Scope 可选范围
- 模块或组件名称，如：api, ui, auth, db, config

### Subject 规则
- 不超过50字符
- 使用动词开头：Add, Fix, Update, Remove, Refactor...
- 不使用句号结尾
- 使用中文描述

### Body 规则
- 解释 what 和 why，不解释 how
- 每行不超过72字符

## 提交检查清单

- [ ] 代码已测试通过
- [ ] 提交信息清晰描述了变更
- [ ] 没有提交敏感信息（密码、密钥等）
- [ ] 相关文档已更新
- [ ] 遵循项目特定的提交规范

## Git 命令建议

```bash
# 查看当前状态
git status

# 查看变更
git diff

# 暂存文件
git add <file>

# 提交
git commit -m "<type>(<scope>): <subject>"

# 推送到远程
git push

# 查看提交历史
git log --oneline -10
```

## 示例

### 好的提交信息
```
feat(auth): 添加第三方登录功能

支持微信和GitHub登录，简化用户注册流程

Closes #123
```

### 不好的提交信息
```
fix: 修复问题

- 改了某些东西
- 应该可以了
```
