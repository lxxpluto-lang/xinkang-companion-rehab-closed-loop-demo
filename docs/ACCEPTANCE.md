# 全栈闭环验收记录

验收日期：2026-08-19，时区：Asia/Shanghai。

## 自动化验证

- Prisma schema 校验与 client 生成。
- PostgreSQL migration 与 seed。
- TypeScript 前端和后端构建。
- Fastify 健康检查。
- 状态文档写入后可从 bootstrap 读取。
- Socket.IO 患者房间收到 `handoff:updated`。
- 完成功率车只更新功率车任务，腹式呼吸保持原状态。
- 实时指标写入 `MetricSample`。

执行命令：

```bash
npm run db:deploy
npm run db:seed
npm run build:all
npm test
```

## 双浏览器验收

| 场景 | 结果 |
| --- | --- |
| 康复师从当天预约确认鲁萱萱到诊 | 通过 |
| 训前评估保存后生成 `P-256572` / 输入码 `256572` | 通过 |
| 第二浏览器输入 `256572` 进入患者首页 | 通过 |
| 首页显示 4 个独立处方项目，其他项目禁用 | 通过 |
| 腹式呼吸连接设备后记录心率、SpO2、时间 | 通过 |
| 医护大屏同步当前项目、指标和任务状态 | 通过 |
| 医护暂停后患者端出现暂停遮罩 | 通过 |
| 暂停、恢复与异常共用场次状态和设备交接 | 代码与 API 验证通过 |
| 服务重载后场次和指标从 PostgreSQL 恢复 | 通过 |

## 已知演示限制

- 外部 Bilibili 视频可能返回站点安全风控；本地上传视频不受影响。
- 真实设备协议、医院 SSO、HIS/EMR、短信和电子签章尚未接入。
- GitHub Pages 仅保留静态离线原型，不宣称支持线上实时联动。
