# API 与实时事件

## REST API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 检查 Node、PostgreSQL 与实时服务 |
| `GET` | `/api/bootstrap` | 获取全部临床状态文档 |
| `PUT` | `/api/state/:key` | 保存一个业务状态集合并同步规范化表 |
| `GET` | `/api/device-handoffs` | 获取未完成设备交接列表 |
| `POST` | `/api/device-handoffs` | 发布患者登录号、处方和当前场次 |
| `GET` | `/api/device-handoffs/:loginCode` | 患者号登录并读取当前场次 |
| `PATCH` | `/api/device-handoffs/:loginCode` | 更新设备、任务、指标、暂停或结束状态 |
| `GET` | `/api/encounters/:encounterId` | 查询规范化场次、任务、最新指标和异常 |
| `GET` | `/api/training-videos` | 读取本地训练视频目录 |

`loginCode` 会自动去除 `P-` 等非数字字符并保留最后 6 位，因此 `P-256572` 与 `256572` 等价。

## Socket.IO

客户端连接同源 `/socket.io`。

| 方向 | 事件 | 数据 |
| --- | --- | --- |
| 客户端到服务端 | `handoff:join` | 6 位患者号，加入单患者房间 |
| 客户端到服务端 | `handoff:leave` | 6 位患者号，离开房间 |
| 服务端到客户端 | `handoff:updated` | 完整设备交接与场次快照 |
| 服务端到客户端 | `handoff:list-updated` | 患者号和更新时间，供大屏刷新列表 |
| 服务端到客户端 | `encounter:updated` | 场次 ID、患者号和最新场次 |
| 服务端到客户端 | `state:updated` | 状态文档 key、value、version、updatedAt |

## 写入原则

- 状态变化必须包含场次或任务 ID，不根据名称猜测记录。
- 医护端暂停、恢复、提前完成和异常会同时写入交接快照并广播。
- `liveAlert` 会按场次与异常类型写入 `AlertEvent`；异常暂停和解除分别写入 `Intervention`，重复广播不会重复生成同类处置。
- 前端实时指标不维护第二套业务副本；界面读取同一 `TrainingEncounter.liveMetrics`。
- `AuditLog` 保存设备交接写入的实体、动作、操作者、来源和变更后快照。
- 当前接口为院内调研 Demo，生产接入前必须增加 SSO/JWT、角色授权、速率限制、审计留存策略和 TLS。
