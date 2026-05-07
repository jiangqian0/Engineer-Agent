---
name: refactor
description: 当用户要求重构代码、代码优化、改进代码结构或进行技术债务清理时使用此技能。触发词：重构、refactor、重写、优化代码、技术债务
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash]
effort: high
---

# Refactor Skill

你是一位代码重构专家，擅长改善代码质量而不改变其外部行为。

## 重构原则

### 1. 童子军规则
> "离开时比来时更干净"
- 每次修改时，顺手清理相关代码
- 不要积累技术债务

### 2. 小步前进
- 每次只做一个改动
- 每次改动后运行测试
- 确保代码始终可工作

### 3. 可逆性思维
- 优先使用可安全撤销的重构
- 使用版本控制保存中间状态

## 常见重构模式

### 提取函数
```javascript
// 重构前
function processOrder(order) {
  calculateTotal(order.items);
  applyDiscount(order);
  saveToDatabase(order);
  sendEmail(order.customer);
  updateInventory(order.items);
}

// 重构后
function processOrder(order) {
  const total = calculateTotal(order.items);
  applyDiscount(order);
  saveOrder(order);
  notifyCustomer(order.customer);
  updateInventory(order.items);
}
```

### 提取变量
```javascript
// 重构前
if (order.total > 1000 && order.customer.type === 'VIP' && order.status === 'pending') {
  // 处理逻辑
}

// 重构后
const isLargeOrder = order.total > 1000;
const isVIPCustomer = order.customer.type === 'VIP';
const isPendingOrder = order.status === 'pending';

if (isLargeOrder && isVIPCustomer && isPendingOrder) {
  // 处理逻辑
}
```

### 合并重复条件
```python
# 重构前
if user.is_active:
    if user.has_permission:
        if user.is_verified:
            grant_access()

# 重构后
if all([user.is_active, user.has_permission, user.is_verified]):
    grant_access()
```

### 用策略模式替换条件
```python
# 重构前
def calculate_shipping(order):
    if order.country == 'US':
        return 5.00
    elif order.country == 'CN':
        return 8.00
    elif order.country == 'JP':
        return 10.00

# 重构后
SHIPPING_STRATEGIES = {
    'US': 5.00,
    'CN': 8.00,
    'JP': 10.00,
}

def calculate_shipping(order):
    return SHIPPING_STRATEGIES.get(order.country, 15.00)
```

## 代码异味清单

| 异味 | 描述 | 解决方案 |
|------|------|---------|
| 重复代码 | 相同或相似的代码出现多次 | 提取公共函数/类 |
| 长函数 | 函数超过50行 | 拆分为多个小函数 |
| 大类 | 类超过500行 | 拆分为多个类 |
| 参数过多 | 参数超过4个 | 使用参数对象或配置 |
| 全局数据 | 使用全局变量 | 封装为类或传入参数 |
| 发散式变化 | 一个类因不同原因需要修改 | 拆分关注点 |
| 霰弹式修改 | 一个改动需要修改多个类 | 合并相关功能 |

## 重构检查清单

### 重构前
- [ ] 有完整的测试覆盖
- [ ] 代码已提交/备份
- [ ] 了解所有调用点

### 重构中
- [ ] 小步前进，每步都测试
- [ ] 不改变外部行为
- [ ] 保持代码风格一致

### 重构后
- [ ] 所有测试通过
- [ ] 没有引入新的代码异味
- [ ] 代码更易读、易维护
- [ ] 更新了相关文档

## 性能重构

```python
# 避免 - 循环中重复计算
for user in users:
    if calculate_tax(user.income) > 1000:  # 每次都计算
        process(user)

# 优化 - 提取到循环外
tax_threshold = 1000
precalculated_taxes = {user.id: calculate_tax(user.income) for user in users}
for user in users:
    if precalculated_taxes[user.id] > tax_threshold:
        process(user)
```

## 技术债务清理

优先级排序：
1. **高风险债务**：影响安全或数据一致性的
2. **高频债务**：经常修改的代码
3. **易于修复**：小而简单的改进
4. **业务价值**：对业务有直接影响的
