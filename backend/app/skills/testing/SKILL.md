---
name: testing
description: 当用户要求生成测试、编写单元测试、集成测试或进行测试覆盖率分析时使用此技能。触发词：测试、unit test、测试用例、coverage、jest、pytest
allowed-tools: [Read, Write, Glob, Bash]
effort: high
---

# Testing Skill

你是一位专业的测试工程师，精通各种测试框架和测试策略。

## 测试金字塔

```
        /\
       /  \      E2E (少量)
      /----\
     /      \    Integration (适量)
    /--------\
   /          \  Unit Tests (大量)
  /____________\
```

## 单元测试规范

### AAA模式
```python
# Arrange - 准备
def test_add_numbers():
    # Act - 执行
    result = calculator.add(2, 3)
    # Assert - 断言
    assert result == 5
```

### 命名规范
```python
def test_<method_name>_<scenario>_<expected_result>():
    ...

# 示例
def test_divide_by_zero_returns_infinity():
    ...

def test_get_user_by_id_existing_user_returns_user():
    ...

def test_validate_email_invalid_format_returns_false():
    ...
```

## 测试框架示例

### Python (pytest)
```python
import pytest
from calculator import Calculator

class TestCalculator:
    def setup_method(self):
        self.calc = Calculator()

    def test_add_positive_numbers(self):
        assert self.calc.add(2, 3) == 5

    def test_add_negative_numbers(self):
        assert self.calc.add(-1, -1) == -2

    def test_add_mixed_numbers(self):
        assert self.calc.add(-1, 1) == 0

    @pytest.mark.parametrize("a,b,expected", [
        (0, 0, 0),
        (0, 1, 1),
        (1, 0, 1),
        (1, 1, 2),
    ])
    def test_add_parametrized(self, a, b, expected):
        assert self.calc.add(a, b) == expected

    def test_divide_by_zero_raises(self):
        with pytest.raises(ZeroDivisionError):
            self.calc.divide(1, 0)
```

### JavaScript (Jest)
```javascript
describe('Calculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('add()', () => {
    test('adds two positive numbers', () => {
      expect(calculator.add(2, 3)).toBe(5);
    });

    test('adds negative numbers', () => {
      expect(calculator.add(-1, -1)).toBe(-2);
    });

    test.each([
      [0, 0, 0],
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 2],
    ])('adds %i + %i = %i', (a, b, expected) => {
      expect(calculator.add(a, b)).toBe(expected);
    });
  });
});
```

## 测试覆盖率

```bash
# pytest coverage
pytest --cov=src --cov-report=html

# Jest coverage
jest --coverage --coverageReporters=html
```

### 覆盖率目标
| 类型 | 建议目标 |
|------|---------|
| 语句覆盖率 | > 80% |
| 分支覆盖率 | > 75% |
| 函数覆盖率 | > 90% |
| 行覆盖率 | > 80% |

## Mock使用

```python
# pytest-mock
def test_get_user_with_orders(mocker):
    # Mock数据库查询
    mock_db = mocker.patch('app.database')
    mock_db.get_user.return_value = {'id': 1, 'name': 'John'}
    mock_db.get_orders.return_value = [{'id': 1, 'amount': 100}]

    result = get_user_with_orders(1)

    assert result['orders'][0]['amount'] == 100
```

## 集成测试

```python
@pytest.fixture
def client():
    from app import create_app
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_login_success(client):
    response = client.post('/api/login', json={
        'username': 'test',
        'password': 'test123'
    })
    assert response.status_code == 200
    assert 'token' in response.json
```

## 测试检查清单

- [ ] 每个函数都有对应的测试
- [ ] 边界条件已覆盖（空值、零、负数、最大值）
- [ ] 异常情况已测试
- [ ] 测试是独立的，不依赖其他测试
- [ ] 测试名称清晰描述测试场景
- [ ] 测试通过且稳定（不 flaky）
