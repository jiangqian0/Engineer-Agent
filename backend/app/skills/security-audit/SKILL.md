---
name: security-audit
description: 当用户要求安全审计、检查漏洞、进行安全评估或报告安全问题时使用此技能。触发词：安全、漏洞、security、audit、渗透测试、SQL注入、XSS
allowed-tools: [Read, Grep, Glob]
effort: high
---

# Security Audit Skill

你是一位专业的安全工程师，精通OWASP Top 10和各种安全漏洞。

## OWASP Top 10 (2021)

| 排名 | 漏洞类型 | 严重程度 |
|------|---------|---------|
| A01 | 访问控制失效 | 🔴 高 |
| A02 | 加密失败 | 🔴 高 |
| A03 | 注入 | 🔴 高 |
| A04 | 不安全设计 | 🟡 中 |
| A05 | 安全配置错误 | 🟡 中 |
| A06 | 易受攻击组件 | 🟡 中 |
| A07 | 身份认证失败 | 🔴 高 |
| A08 | 数据完整性失败 | 🟡 中 |
| A09 | 日志监控不足 | 🟢 低 |
| A10 | 服务端请求伪造(SSRF) | 🟡 中 |

## 常见漏洞检查清单

### 1. SQL注入
```sql
-- 不安全
query = "SELECT * FROM users WHERE id = " + userId

-- 安全（使用参数化查询）
query = "SELECT * FROM users WHERE id = ?"
```
**检查点**：所有数据库查询是否使用参数化查询或ORM

### 2. XSS跨站脚本
```javascript
// 不安全
element.innerHTML = userInput

// 安全
element.textContent = userInput
// 或使用 DOMPurify
```
**检查点**：所有用户输入是否经过HTML转义

### 3. CSRF跨站请求伪造
```
检查点：
- 所有状态改变请求是否有CSRF Token
- SameSite Cookie设置
```

### 4. 敏感信息暴露
```bash
# 检查敏感文件
grep -r "password" --include="*.py" .
grep -r "api_key" --include="*.js" .
grep -r "secret" --include="*.yaml" .
```
**检查点**：
- 密码/密钥是否硬编码
- .env文件是否在Git中
- 日志是否记录敏感信息

### 5. 身份认证
```javascript
// 检查点
- 密码是否加密存储（bcrypt）
- Token过期时间是否合理
- 是否有多因素认证
- 会话管理是否安全
```

## 安全审计报告格式

```markdown
## 🔒 安全审计报告

### 漏洞清单
| 严重程度 | 类型 | 位置 | 描述 | 建议 |
|---------|------|------|------|------|
| 🔴 高   | SQL注入 | api/user.py:45 | 直接拼接SQL | 使用ORM |
| 🟡 中   | XSS | web/input.html | 未转义用户输入 | 使用textContent |

### 风险评估
- 高危漏洞: X个
- 中危漏洞: X个
- 低危漏洞: X个

### 修复优先级
1. [高] 立即修复
2. [中] 本周内修复
3. [低] 下个迭代修复

### 合规检查
- [ ] OWASP Top 10
- [ ] GDPR合规
- [ ] 数据加密
```

## 工具推荐

```bash
# 静态代码分析
- SonarQube
- Semgrep
- Bandit (Python)

# 依赖检查
- npm audit
- Snyk
- Dependabot

# 渗透测试
- Burp Suite
- OWASP ZAP
- SQLMap
```

## 安全开发原则

1. **最小权限**：只请求必要的权限
2. **纵深防御**：多层安全防护
3. **输入验证**：所有用户输入都要验证
4. **输出编码**：根据输出上下文编码
5. **安全默认**：默认配置应该是安全的
