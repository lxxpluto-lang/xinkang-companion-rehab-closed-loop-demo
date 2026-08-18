# 本地与局域网部署

## Docker Compose

```bash
cp .env.example .env
npm run fullstack
```

首次启动会创建 PostgreSQL 16、执行 migration、写入脱敏种子数据并启动应用。默认地址：

- 本机：`http://127.0.0.1:8787`
- 健康检查：`http://127.0.0.1:8787/api/health`
- 局域网：`http://<本机局域网IP>:8787`

macOS 可用 `ipconfig getifaddr en0` 查询 Wi-Fi 地址。手机或 Pad 必须与电脑处于同一局域网，并允许防火墙放行 8787 端口。

## Homebrew PostgreSQL 降级

Docker 不可用时：

```bash
brew install postgresql@16
brew services start postgresql@16
createdb xinkang
cp .env.example .env
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build:all
npm start
```

按本机数据库用户修改 `.env` 的 `DATABASE_URL`。开发联调可分别运行：

```bash
npm run dev:server
npm run dev:web
```

Vite 地址默认 `http://127.0.0.1:4182`，API 与 Socket.IO 自动代理到 8787。

## 演示步骤

1. 在医护端以 `rehab001` 登录，密码使用页面标注的脱敏演示密码。
2. 进入预约管理，找到当天鲁萱萱预约并确认到诊。
3. 填写训练前血压、心率、SpO2、呼吸，进入训练大屏。
4. 在另一浏览器或局域网设备打开同一地址，选择患者训练端，输入 `256572`。
5. 患者首页显示 4 项处方任务；只有腹式呼吸、功率车、哑铃力量、全身柔韧训练可点击。
6. 连接模拟监测设备并开始腹式呼吸，医护端查看实时心率、血氧与时间。
7. 医护端执行暂停、恢复、异常或快速完成；患者端同步变化。
8. 完成项目后在患者端报告页查看单次报告，再由康复师结束今日训练并填写训后评估。

## 持久化检查

```bash
docker compose restart app db
curl http://127.0.0.1:8787/api/health
```

重启后重新打开浏览器，预约、任务、指标、报告仍应存在。数据库卷为 `xinkang-postgres`；不要使用 `docker compose down -v`，除非明确要删除全部演示数据。

## GitHub Pages 限制

GitHub Pages 只托管前端静态文件，不能运行 Fastify、PostgreSQL 或 Socket.IO。Pages 会保留离线原型演示，但跨设备联动与持久化必须使用本地全栈地址或公网服务器地址。远程前后端分离时设置 `VITE_API_BASE_URL` 后重新构建。
