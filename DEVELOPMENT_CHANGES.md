# OpenClaw 隔离开发版升级记录

本文档记录了为实现项目内隔离运行及解决相关报错所做的关键改动。

## 1. 核心隔离机制 (Isolation)
- **局部状态目录支持**：修改了 `src/config/paths.ts` 中的 `resolveStateDir` 函数。现在若当前工作目录下存在 `.openclaw` 文件夹，OpenClaw 会优先将其作为状态目录（State Dir），从而实现多实例间的数据与配置物理隔离。
- **Git 忽略**：在 `.gitignore` 中添加了 `.openclaw/`，确保本地开发产生的临时配置、日志和工作空间不会进入版本控制。

## 2. 环境变量配置 (.env)
在根目录创建了 `.env` 文件，定义了开发版专用参数：
- `OPENCLAW_STATE_DIR="./.openclaw"`：强制使用本地状态目录。
- `OPENCLAW_GATEWAY_PORT=18790`：避开原版默认端口 (18789)。
- `OPENCLAW_DASHBOARD_PORT=18791`：独立仪表盘端口。

## 3. Onboarding 流程优化
- **插件安装幂等性**：修改了 `src/commands/onboarding/plugin-install.ts`。将插件下载模式从“创建”改为“更新”，解决了在 `.openclaw` 重复初始化时报错“目录已存在”的问题，使得 `onboard` 命令可以安全地重复运行。

## 4. 模型与网关配置 (openclaw.json)
针对隔离版 `.openclaw/openclaw.json` 进行了专项调优：
- **认证模式**：将 `gateway.auth.mode` 设为 `none`。解决了本地多实例运行时，浏览器因端口/Cookie 隔离导致的 Token 验证失败（`token_missing`）报错。
-   **Model Parameter Tuning**:
    -   Increased DeepSeek models **Context Window** to `128,000` to prevent "Model context window too small" errors during long runs.
    -   Adjusted **Max Tokens** (generation limit) to `8,192` to comply with provider output limits while maintaining large context.
- **容量修复 (Critical)**：将 DeepSeek 模型的 `contextWindow` 从 4096 提升至 **128,000**。修复了因上下文窗口过小导致的智能体拒绝响应报错。
- **配置精简**：合并了重复的 AI 提供商定义，清理了导致启动校验失败的非规范键值（如 `gateway.name`）。

## 4. Performance & Stability: Fix for "Gateway Death" (Event Loop Blocking)

Resolved issues where the Gateway would become unresponsive ("fake death" or "dormancy") during intensive activity or when handling large transcript files:

-   **Optimized Idempotency Checks**: Rewrote `transcriptHasIdempotencyKey` to read only the last `64KB` of the transcript file instead of the entire file. This prevents massive synchronous I/O spikes when appending messages to long sessions.
-   **Chunked Transcript Reading**: Optimized `readSessionMessages` to read transcript files in `1MB` chunks using `fs.readSync` instead of a single `fs.readFileSync`. This reduces memory pressure and prevents blocking the event loop when loading history for large chats.
-   **Prevention of Suspension**: Documentation of potential Windows "Efficiency Mode" or terminal "Select Mode" as external causes for process suspension.
- **工作空间重定向**：将 `agents.defaults.workspace` 指向本地路径，确保开发时的文件操作不会干扰全局工作区。

---
*记录时间：2026-02-22*
