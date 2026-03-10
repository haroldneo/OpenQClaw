# 🦞 OpenQClaw

> QClaw 今日开放限量内测，OpenQClaw 去除了其内测邀请码限制，现在任何人都可以直接使用微信和 QClaw 聊天啦

## 📌 置顶更新

> 根据社区反馈，目前 QClaw 临时阻断了当前版本直接调用无限量默认模型的 API，经尝试可通过**自定义模型**继续使用 OpenQClaw，测试确认可使用 **GLM-5、MiniMax M2.5、Qwen3.5** 等模型。
>
> OpenQClaw 0.1.2 已完成维护，现已同步提供 **Apple Silicon (arm64)** 和 **Intel (x64)** 版本，并去除了启动时“发现新版本”弹窗的强制拦截逻辑；即使不更新，也可以继续使用。

<p align="center">
  <img src="screenshots/openqclaw-agent-wechat-group-qrcode.png" width="260" alt="OpenQClaw Agent 微信交流群二维码" />
</p>

<p align="center">
  <img src="screenshots/custom-model-settings.png" width="45%" alt="自定义模型设置" />
  &nbsp;&nbsp;
  <img src="screenshots/custom-model-list.png" width="45%" alt="可用模型列表" />
</p>

<p align="center">
  <img src="screenshots/custom-model-chat.png" width="70%" alt="自定义模型聊天效果" />
</p>

## 🔒 Before → 🔓 After

<p align="center">
  <img src="screenshots/before.png" width="45%" alt="Before - 邀请码拦截" />
  &nbsp;&nbsp;
  <img src="screenshots/after.png" width="45%" alt="After - 自由使用" />
</p>

<p align="center">
  <em>左：原版需要邀请码 → 右：OpenQClaw 直接进入主界面</em>
</p>

## 💬 效果展示

<p align="center">
  <img src="screenshots/chat.png" width="70%" alt="Chat with AI Lobster" />
</p>

## 📖 什么是 QClaw？

[QClaw](https://claw.guanjia.qq.com/) 是**腾讯电脑管家官方出品**的全能电脑 AI 助手，核心特性：

- 🦞 **微信直联** — 通过微信远程操控电脑，随时随地让 AI 干活
- 📦 **开箱即用** — 内置国产优质大模型，支持切换自定义模型
- 🔧 **5000+ Skills** — 支持 ClawHub、GitHub 等丰富 Skills 生态
- 🧠 **持续记忆** — 记住偏好和上下文，最懂你的 AI
- 💻 **本地操控** — 直接操控文件、浏览器、邮件，不只是聊天

目前 QClaw 处于**邀请制内测**阶段，需要邀请码才能使用。**OpenQClaw 去除了这一限制。**

## 🚀 使用方法

1. 从 [Releases](https://github.com/haroldneo/OpenQClaw/releases) 下载对应架构的安装包：
   - Apple Silicon: `OpenQClaw-0.1.2-arm64.app.zip`
   - Intel: `OpenQClaw-0.1.2-x64.app.zip`
2. 解压后将 `OpenQClaw-0.1.2-*.app` 拖入 `/Applications`
3. 首次打开如遇安全提示，前往 **系统设置 → 隐私与安全性** 点击「仍要打开」
4. 微信扫码登录，即可开始使用 🎉

## 🔧 技术原理

QClaw 基于 Electron 构建，前端邀请码验证与启动更新检测逻辑位于 `app.asar` 内的 renderer 层：

1. **提取** `app.asar` 获取前端源码
2. **定位** `Chat` 组件中的 `checkInviteCode` 调用、`WXLoginView` 登录后校验，以及更新检测弹窗逻辑
3. **Patch** 邀请码校验逻辑：
   - `Chat` chunk — 将邀请码状态 `isInviteVerified` 初始化为 `true`，跳过 API 校验
   - `WXLoginView` chunk — 将登录后的邀请码检查直接放行
4. **Patch** 更新检测逻辑：
   - 移除启动时自动执行的版本检查
   - 将更新弹窗改为始终可关闭，不再因 `force` 策略阻止继续使用
5. **移除** `Info.plist` 中的 `ElectronAsarIntegrity` 哈希校验
6. **重新打包** asar 并 ad-hoc 签名

整个过程由 [Amp](https://ampcode.com) Smart Mode (Claude Opus 4.6) 在 **~4 分钟内自动完成**。

## ⚠️ 免责声明

本项目仅供学习和研究目的。QClaw 的所有权利归腾讯公司所有。使用本项目即表示你了解并接受相关风险。

## 📄 License

MIT
