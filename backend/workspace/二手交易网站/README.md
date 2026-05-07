# 二手交易网站

一个功能完整的二手交易平台，支持用户发布商品、浏览、搜索、购买等功能。

## 项目结构

```
二手交易网站/
├── backend/                 # 后端代码
│   ├── server.js           # 服务器入口
│   ├── routes/             # 路由
│   ├── models/             # 数据模型
│   └── middleware/         # 中间件
├── frontend/               # 前端代码
│   ├── index.html          # 首页
│   ├── css/                # 样式文件
│   ├── js/                 # JavaScript文件
│   └── images/             # 图片资源
├── database/               # 数据库相关
│   └── schema.sql          # 数据库结构
└── README.md               # 项目说明
```

## 功能特性

- 用户注册/登录
- 商品发布
- 商品浏览与搜索
- 商品分类
- 购物车
- 订单管理
- 用户评价
- 消息系统

## 技术栈

- 后端：Node.js + Express
- 前端：HTML5 + CSS3 + JavaScript
- 数据库：SQLite（轻量级）或 MySQL
- 认证：JWT
