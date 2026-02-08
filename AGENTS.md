## 1. 关于项目
本项目是一个跨 macOS 和 Windows 番茄时钟应用，使用 Tauri 2.x（已稳定发布）来做跨平台桌面端。

1) MVP 功能清单（最小闭环）

计时：
* 阶段：专注 / 短休息 / 长休息
* 默认：25/5/15（可改）
* 完成 N 个专注后进入长休息（默认 N=4，可改）
* 操作：开始 / 暂停 / 继续 / 跳过 / 重置

提醒
* 阶段结束：系统通知（可开关）
* 可选：提示音（可开关，先用前端播放即可）

持久化
* 保存设置：时长、长休息间隔、通知/声音开关
* 保存“正在计时的状态”（避免重启后乱掉）：phase、running、paused、endAt/remaining

2) 架构决策：计时放 Rust（强烈推荐）
原因就一句：前端 WebView 可能被降频/挂起，计时放前端会漂。
所以：Rust 维护 Timer Engine，UI 只负责展示和按钮。
通信模型：
	•	UI → Rust：invoke("timer_start" | "timer_pause" | ...)
	•	Rust → UI：emit("timer_tick") 每 1 秒推一次剩余时间

3) 状态机与数据模型（最简但抗漂移）

Phase
	•	Focus
	•	ShortBreak
	•	LongBreak

TimerState（核心状态）
	•	phase: Phase
	•	is_running: bool
	•	cycle_count: u32（已完成 focus 次数）
	•	end_at_ms: Option<i64>（运行时：目标结束时间戳，单位 ms）
	•	remaining_ms: i64（暂停时：剩余 ms）
	•	settings: Settings

Settings
	•	focus_ms
	•	short_break_ms
	•	long_break_ms
	•	long_break_every（默认 4）
	•	notify_enabled
	•	sound_enabled

计时计算（抗漂移关键）
	•	运行中：remaining = end_at - now
	•	暂停：保存 remaining_ms
	•	继续：end_at = now + remaining_ms

4) 项目结构（最小但清晰）

```
pomodoro/
  src/                       # 前端 React/Vite
    features/timer/
      TimerView.tsx
      timerEvents.ts
    features/settings/
      SettingsView.tsx
    app.tsx
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
        notify.rs
```

持久化不需要 DB：直接写一个 JSON 文件（Rust 管控）：
	•	settings.json
	•	runtime_state.json

5) UI 页面（就 2 个）
	1.	TimerView

	•	大号倒计时（mm:ss）
	•	显示当前阶段（Focus/Break）
	•	按钮：Start/Pause/Resume + Skip + Reset

	2.	SettingsView

	•	三个时长输入（分钟）
	•	长休息间隔 N
	•	通知开关、声音开关