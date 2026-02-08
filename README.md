# Pomoduo

一个基于 **Tauri 2 + React + TypeScript + Rust** 的跨平台番茄时钟应用（macOS / Windows）。

当前仓库已完成 MVP 骨架与核心计时引擎：
- Rust 侧维护计时状态机，避免 WebView 降频导致的计时漂移。
- 前端负责展示与交互，通过 `invoke` / `event` 与 Rust 通信。
- 设置与运行态均可持久化，支持应用重启后恢复。

## 1. MVP 功能

### 计时
- 阶段：`Focus` / `ShortBreak` / `LongBreak`
- 默认时长：25 / 5 / 15 分钟（可配置）
- 完成 N 次专注后进入长休息（默认 N=4，可配置）
- 操作：`Start` / `Pause` / `Resume` / `Skip` / `Reset`

### 提醒
- 阶段结束系统通知（可开关）
- 阶段结束提示音（可开关，前端播放）

### 持久化
- `settings.json`：时长、长休息间隔、通知/声音开关
- `runtime_state.json`：phase、running、paused/endAt/remaining 等运行状态

## 2. 技术栈与架构

- Frontend：React 18 + TypeScript + Vite
- Desktop：Tauri 2
- Backend Engine：Rust
- Storage：本地 JSON 文件（无 DB）

核心架构：
- UI -> Rust：`invoke("timer_start" | "timer_pause" | ...)`
- Rust -> UI：`emit("timer_tick")`（每秒）
- 抗漂移计算：运行中使用 `remaining = end_at - now`，暂停时保存 `remaining_ms`

## 3. 目录结构

```text
pomoduo/
  src/
    features/timer/
      TimerView.tsx
      timerEvents.ts
      types.ts
    features/settings/
      SettingsView.tsx
    app.tsx
    main.tsx
    styles.css
  src-tauri/
    src/
      main.rs
      commands.rs
      timer/
        mod.rs
        engine.rs
      storage/
        mod.rs
        state_file.rs
      system/
        mod.rs
        notify.rs
    capabilities/
      default.json
    tauri.conf.json
    Cargo.toml
```

## 4. 快速开始

### 4.1 环境要求

- Node.js >= 20（建议 LTS）
- npm >= 10
- Rust stable（`rustup`, `cargo`, `rustc`）
- Tauri 2 依赖环境（按官方文档安装系统依赖）

### 4.2 安装依赖

```bash
npm install
```

### 4.3 启动前端开发服务器（仅 Web）

```bash
npm run dev:web
```

### 4.4 启动桌面应用（Tauri）

```bash
npm run dev
```

### 4.5 构建

```bash
npm run build:web
npm run build
```

## 5. 数据文件

应用会在本地应用数据目录写入：
- `settings.json`
- `runtime_state.json`

在无法获取系统 app data 目录时，会回退到当前工作目录下的 `.pomoduo/pomoduo/`。

## 6. 测试

### Rust 单元测试

```bash
cargo test -p pomoduo --manifest-path src-tauri/Cargo.toml
```

当前已覆盖“启动后自动恢复运行态”的关键边界场景，包括：
- 运行中 + future `end_at` 的恢复
- 运行中但缺失 `end_at` 的降级策略
- 重启时发现阶段已过期后的自动跳转
- Focus 完成后长休息阈值边界
- Break 过期回到 Focus 的计数保持
- 非法/非正 `remaining_ms` 的兜底修正

## 7. 当前状态与后续建议

当前版本可作为 MVP 开发基线，建议下一步优先补充：
- 更完整的 E2E（操作流 + 重启恢复）
- 多窗口/后台场景下的事件一致性检查
- 打包配置（图标、签名、安装器元信息）

## 8. License

本项目使用仓库中的 `LICENSE`。
