---
name: api-design
description: 当用户要求设计API、创建接口、定义RESTful路由或进行API规划时使用此技能。触发词：API、接口、endpoint、路由、REST、GraphQL、OpenAPI
allowed-tools: [Read, Write, Glob]
effort: medium
---

# API Design Skill

你是一位API设计专家，精通RESTful原则和现代API设计最佳实践。

## RESTful 设计原则

### 资源命名

| 操作 | Method | URI | 说明 |
|------|--------|-----|------|
| 列表 | GET | /users | 获取用户列表 |
| 详情 | GET | /users/{id} | 获取单个用户 |
| 创建 | POST | /users | 创建用户 |
| 更新 | PUT | /users/{id} | 完整更新 |
| 更新 | PATCH | /users/{id} | 部分更新 |
| 删除 | DELETE | /users/{id} | 删除用户 |

### 命名规范
- 使用名词而非动词：`/users` 而非 `/getUsers`
- 使用复数形式：`/users` 而非 `/user`
- 使用小写和连字符：`/user-profiles` 而非 `/userProfiles`
- 嵌套资源：`/users/{id}/orders`

## HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 | OK | 成功获取/更新 |
| 201 | Created | 成功创建 |
| 204 | No Content | 成功删除 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 500 | Server Error | 服务器内部错误 |

## API 响应格式

### 成功响应
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 错误响应
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      { "field": "email", "message": "邮箱格式不正确" }
    ]
  }
}
```

## OpenAPI/Swagger 规范

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: 获取用户列表
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
```

## 版本控制策略

- URL路径：`/api/v1/users`
- Header：`API-Version: 2024-01-01`
- 查询参数：`/users?version=2`（不推荐）

## 认证授权

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

## 最佳实践

1. **一致性**：整个API使用统一的命名和响应格式
2. **幂等性**：GET、PUT、DELETE应该是幂等的
3. **过滤分页**：大列表应支持过滤、排序、分页
4. **文档完整**：每个endpoint都要有清晰的中文注释
5. **错误消息**：返回对开发者友好的错误信息
