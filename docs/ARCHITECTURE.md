# 心康伴侣全栈架构

## 目标与边界

本项目保留现有 React 原型的交互和视觉，新增 Fastify、PostgreSQL、Prisma 与 Socket.IO。PostgreSQL 是业务事实来源；浏览器 `localStorage` 仅在后端不可用的 GitHub Pages 静态演示中作为降级，不作为全栈模式的数据来源。

当前仍是脱敏调研 Demo。账号密码为演示凭据，未接入医院 SSO、真实设备协议、HIS/EMR 或生产级身份认证，不能用于真实诊疗。

## 系统架构

```mermaid
flowchart LR
  D[医生/康复师 Web] -->|REST| API[Fastify API]
  P[患者训练端] -->|REST| API
  D <-->|Socket.IO| RT[实时事件服务]
  P <-->|Socket.IO| RT
  API --> R[Prisma Repository]
  RT --> R
  R --> DB[(PostgreSQL 16)]
  API --> S[React 18 静态资源]
  N[Nginx / 公网入口] --> API
  GH[GitHub Pages] --> F[仅前端离线演示]
```

生产模式由同一 Node 服务提供前端静态资源、`/api` 与 `/socket.io`。开发模式由 Vite 提供页面，并代理 API 和 WebSocket 到 `127.0.0.1:8787`。

## 数据闭环

```mermaid
flowchart LR
  A[预约] --> B[到诊]
  B --> C[训练前评估]
  C --> D[患者登录号]
  D --> E[患者核对处方]
  E --> F[独立训练任务]
  F --> G[实时指标]
  G --> H{异常?}
  H -- 是 --> I[双端告警/暂停/处置]
  I --> F
  H -- 否 --> J[单项完成]
  J --> K{还有任务?}
  K -- 是 --> F
  K -- 否或提前结束 --> L[训练后评估]
  L --> M[单次报告]
  M --> N[阶段报告]
  N --> O[下一版处方/随访]
```

每个训练项目拥有独立 `TrainingTask.id` 和状态。功率车完成只更新功率车任务，不能通过项目顺序或页面选择状态推断其他项目已完成。

## ER 图

```mermaid
erDiagram
  USER {
    string id PK
    string username UK
    string role
  }
  PATIENT ||--o{ ASSESSMENT : has
  PATIENT ||--o{ PRESCRIPTION : receives
  PRESCRIPTION ||--|{ PRESCRIPTION_ITEM : contains
  PATIENT ||--o{ APPOINTMENT : books
  PRESCRIPTION ||--o{ APPOINTMENT : applies
  APPOINTMENT ||--o| TRAINING_ENCOUNTER : creates
  TRAINING_ENCOUNTER ||--|{ TRAINING_TASK : contains
  TRAINING_ENCOUNTER ||--o{ DEVICE_SESSION : connects
  TRAINING_TASK ||--o{ METRIC_SAMPLE : records
  TRAINING_ENCOUNTER ||--o{ ALERT_EVENT : raises
  ALERT_EVENT ||--o{ INTERVENTION : handled_by
  TRAINING_ENCOUNTER ||--o{ TREATMENT_ASSESSMENT : assessed
  TRAINING_ENCOUNTER ||--o{ SINGLE_REPORT : generates
  PATIENT ||--o{ STAGE_REPORT : summarizes
  PATIENT ||--o{ FOLLOW_UP : schedules
  PATIENT {
    string id PK
    string patientNo UK
    string loginCode UK
    string riskLevel
  }
  TRAINING_ENCOUNTER {
    string id PK
    string appointmentId UK
    string status
    string activeTaskId
  }
  TRAINING_TASK {
    string id PK
    string encounterId FK
    int order
    string status
  }
  AUDIT_LOG {
    bigint id PK
    string entityType
    string entityId
    string actor
    string source
  }
```

## 状态与一致性

- 预约状态：`pending`、`confirmed`、`arrived`、`in_training`、`completed`、`cancelled`、`no_show`。
- 场次状态：`pre_assessment`、`ready_for_device`、`device_ready`、`in_training`、`paused`、`awaiting_next_task`、`post_assessment`、`pending_signature`、`completed`、`terminated`。
- 任务状态：`pending`、`in_progress`、`completed`、`partially_completed`、`interrupted`、`skipped`。
- 登录号按患者主档固定，设备交接按登录号唯一更新到当前场次。
- 指标通过交接事件即时广播；PostgreSQL 中的指标采样按至少 5 秒间隔及任务结束节点保存，减少高频写入。
- `StateDocument` 是旧原型数据结构的兼容层；每次写入同时同步到规范化业务表。后续可逐模块删除兼容层，不改变现有页面。

## 关键假设

- 同一患者同一时刻只有一个可登录的院内训练场次。
- 登录号仅用于院内设备交接，不等同于患者身份认证凭证。
- AI 只生成建议和摘要，处方发布、异常处置、报告签署仍由有权限的医护人员确认。
- 外部训练视频链接可能受站点防盗链限制；生产环境应上传到自有对象存储或项目视频目录。
