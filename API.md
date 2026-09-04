# Itinera API 文档

Base URL: `http://localhost:3000/api`

所有请求/响应均为 JSON（`Content-Type: application/json`）。认证类接口通过 HTTP Cookie 会话（`session`）识别用户。

## 速率限制

以下接口启用了基于滑动窗口的限流（内存实现，可替换为 Redis）：

| 接口 | 限制 |
|---|---|
| `POST /api/agent` | 10 次 / 分钟 / 用户 |
| `POST /api/auth` | 10 次 / 分钟 / IP |
| `POST /api/reservations` | 20 次 / 分钟 / 用户 |
| `POST /api/orders` | 20 次 / 分钟 / 用户 |

触发限流返回 `429`，响应头带 `Retry-After`（秒）。

---

## GET /api/health

健康检查端点，用于容器 healthcheck 与监控。

**响应**

```json
{ "status": "ok", "service": "itinera", "version": "1.0.0", "timestamp": "2026-09-04T05:00:00.000Z" }
```

---

## POST /api/auth

注册 / 登录 / 登出 / 会话查询，通过 `action` 字段区分。

**请求体（注册）**

```json
{ "action": "register", "email": "user@example.com", "password": "secret123", "name": "小明", "district": "chaoyang" }
```

**请求体（登录）**

```json
{ "action": "login", "email": "user@example.com", "password": "secret123" }
```

**校验规则（zod）**

- `email`：合法邮箱格式
- `password`：6–128 位
- `name`：≤ 50 字符
- `district`：北京 10 个区之一（enum）

**响应（成功）** `200`

```json
{ "ok": true, "user": { "id": "u_...", "email": "user@example.com", "name": "小明", "district": "chaoyang" } }
```

**错误** `400` 参数不合法 · `401` 凭据错误 · `429` 限流

密码使用 Node 内置 `crypto.scrypt` 加盐哈希存储（`scrypt$<salt>$<hash>`），常数时间比较，无原生依赖。

---

## GET /api/venues

场地列表，支持筛选。

| 参数 | 说明 |
|---|---|
| `district` | 区（可选） |
| `type` | 场地类型（可选） |
| `q` | 关键词搜索（可选） |

**响应** `200`：`{ "venues": Venue[] }`

---

## GET /api/restaurants

餐厅列表，参数同 `/api/venues`。响应 `200`：`{ "restaurants": Restaurant[] }`

---

## POST /api/agent

AI 行程规划核心接口。调用 OpenAI 兼容 LLM 生成 ```itinerary``` 围栏 JSON 行程；LLM 失败时自动降级为确定性兜底行程。

**请求体**

```json
{ "prompt": "带 3 岁孩子周日下午去朝阳，预算 500 以内", "district": "chaoyang", "groupType": "family", "groupSize": 3 }
```

**响应** `200`

```json
{
  "reply": "为您规划如下…",
  "itinerary": {
    "title": "亲子半日出游",
    "date": "2026-09-05",
    "startTime": "14:00",
    "endTime": "18:00",
    "groupType": "family",
    "groupSize": 3,
    "totalCost": 500,
    "steps": [
      {
        "startTime": "14:00", "endTime": "16:00", "title": "海洋馆", "type": "activity",
        "venueName": "海洋馆", "venueId": "v1", "address": "朝阳区", "description": "看鱼",
        "cost": 50, "latitude": 39.9, "longitude": 116.4
      }
    ],
    "suggestedOrders": []
  }
}
```

**错误** `503` 未配置 LLM（`LLM_API_KEY` 缺失，响应体含配置指引） · `429` 限流 · `500` 其他

> LLM 输出视为不可信输入：服务端会严格校验每个字段（时间格式 `HH:mm`、数值范围、类型），不合法字段被拒绝或安全降级。

---

## POST /api/reservations

创建场地预订。

**请求体**

```json
{ "venueId": "v1", "date": "2026-09-05", "time": "14:00", "partySize": 3, "userId": "u_..." }
```

**校验**：`date` 需 `YYYY-MM-DD`；`time` 需 `HH:mm`；`partySize` 1–50。

**响应** `200`：`{ "ok": true, "reservation": { ... } }`　**错误** `400` / `429`

---

## POST /api/orders

创建订单（餐饮/蛋糕等）。

**请求体**

```json
{ "userId": "u_...", "itemType": "cake", "itemName": "儿童蛋糕", "price": 128, "target": "轻食坊" }
```

**校验**：`price` 0–100000。

**响应** `200`：`{ "ok": true, "order": { ... } }`　**错误** `400` / `429`

---

## GET /api/weather?district=chaoyang

查询指定区天气（聚合外部天气源，服务端缓存）。响应 `200`：`{ "forecast": [{ "time": "14:00", "icon": "☀️", "temp": 28 }] }`

## GET /api/venue-detail?id=v1

单个场地详情（含营业时间、设施等）。

## GET /api/messages / GET /api/chat-sessions

当前用户的聊天记录与会话列表（需登录会话）。

## GET /api/user

当前登录用户信息；未登录返回 `401`。

---

## 错误响应格式

所有错误统一为：

```json
{ "ok": false, "error": "人类可读的错误描述" }
```
