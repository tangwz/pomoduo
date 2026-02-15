# Release Runbook (v0.1)

本文档定义 Pomoduo `v0.1.x` 的发布流程，目标是通过 Git tag 自动产出 macOS/Windows 安装包并上传到 GitHub Release。

## 1. 发布前检查

在发布前，确保本地代码与主分支一致，并完成以下检查：

```bash
git checkout main
git pull --ff-only
npm ci
npm run build:web
cargo test -p pomoduo --manifest-path src-tauri/Cargo.toml
```

## 2. 版本同步规则

发布前需要确认以下 3 个文件中的版本号完全一致：

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

当前 tag 命名规则：

- Git tag: `vX.Y.Z`
- App version: `X.Y.Z`

例如：`v0.1.0` 对应 `0.1.0`。

## 3. 正式发布步骤

### 3.1 创建并推送 tag

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

### 3.2 等待 GitHub Actions 发布流水线

`release.yml` 会在 macOS 和 Windows runner 上并行构建，并上传：

- `Pomoduo_<version>_x64.dmg`
- `Pomoduo_<version>_x64-setup.exe`
- `SHA256SUMS.txt`

发布成功后，GitHub Release 页面应包含上述 3 类产物。

## 4. 冒烟验证清单

发布后建议立即执行以下验证：

- macOS：下载 DMG，安装并启动，完成 1 次 Focus -> Break 切换。
- Windows：下载 EXE，安装并启动，验证计时和重启恢复。
- 功能回归：通知/提示音开关行为正常。

## 5. 未签名构建说明

`v0.1.x` 默认不做代码签名和公证，用户首次安装时可能会看到系统安全提示。  
建议在 Release Notes 中明确说明：这是未签名预览版本，并附带安装提示。

## 6. 回滚方案

如果误发 tag 或产物异常，建议按以下顺序处理：

1. 在 GitHub 上删除错误的 Release。
2. 删除远程 tag。
3. 删除本地 tag。
4. 修复问题后重新发新 tag。

```bash
git push origin :refs/tags/v0.1.0
git tag -d v0.1.0
```
