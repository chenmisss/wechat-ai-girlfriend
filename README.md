# 💕 微信AI女友机器人 — 增强版

一个运行在微信上的 AI 女友聊天机器人，支持多模型聊天、AI 自拍生成、场景拍照、角色记忆系统等功能。

![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ 功能特色

### 🤖 智能聊天
- **多 AI 服务商支持**：xAI (Grok)、DeepSeek、OpenAI、硅基流动、零一万物，或任何 OpenAI 兼容 API
- **深度角色扮演**：内置详细人设系统，说话像真人微信聊天
- **时间感知**：根据不同时段自动调整语气和状态
- **用户记忆**：自动记住用户的姓名、生日、喜好等信息
- **对话历史**：持久化保存聊天记录，重启不丢失

### 📸 AI 图片生成
- **自拍功能**：基于固定参考图编辑，保持每张自拍都是**同一个人**
- **场景拍照**：拍猫咪、房间、办公室、厨房等场景照（纯文生图）
- **使用豆包 Seedream**：字节跳动文生图模型，画质高、中文理解好

### 👩 角色系统
- 完整外貌特征描述（发型、五官、身材、穿搭）
- 猫咪「团团」详细设定
- 家庭环境描述（北欧风公寓）
- 工作场景描述（梦想科技、loft 办公室）
- 恋爱故事背景
- 8种情绪状态系统

## 🚀 快速开始

### 环境要求

- **Node.js 16-20**（推荐 v20 LTS，不支持 v24+）
- 微信账号（建议使用**小号**，详见安全提示）

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/AI_Girlfriend.git
cd AI_Girlfriend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API 密钥
```

### 配置 API 密钥

编辑 `.env` 文件，至少需要配置：

```bash
# AI 聊天模型（必填）
AI_PROVIDER=xai
AI_API_KEY=your_xai_api_key    # 从 https://console.x.ai 获取

# 图片生成（可选，不填则仅文字聊天）
DOUBAO_IMAGE_API_KEY=your_key  # 从 https://console.volcengine.com/ark 获取
```

### 启动

```bash
npm start
```

扫描终端中的二维码登录微信，登录后机器人即开始运行。

## 📱 使用方式

登录后，**用另一个微信号**给机器人发消息：

| 消息示例 | 触发功能 |
|---------|---------|
| `你好呀` | 💬 AI 聊天回复 |
| `发张自拍` / `看看你` | 📸 自拍（参考图编辑，同一张脸） |
| `你在干嘛` | 📸 自拍 + 场景描述 |
| `看看团团` | 🐱 猫咪照片 |
| `看看你家` / `你的房间` | 🏠 家的照片 |
| `你的工位` | 🏢 办公室照片 |
| `/清除记忆` | 🔧 清空对话历史 |
| `/状态` | 📊 查看系统状态 |

## 🔧 AI 服务商配置

| 服务商 | AI_PROVIDER | 获取密钥 | 默认模型 |
|--------|-------------|----------|----------|
| xAI | `xai` | [console.x.ai](https://console.x.ai) | grok-4-1-fast-non-reasoning |
| DeepSeek | `deepseek` | [platform.deepseek.com](https://platform.deepseek.com) | deepseek-chat |
| OpenAI | `openai` | [platform.openai.com](https://platform.openai.com) | gpt-4o-mini |
| 硅基流动 | `siliconflow` | [cloud.siliconflow.cn](https://cloud.siliconflow.cn) | Qwen/Qwen2-7B-Instruct |
| 零一万物 | `lingyiwanwu` | [platform.lingyiwanwu.com](https://platform.lingyiwanwu.com) | yi-lightning |
| 自定义 | `custom` | — | 需设置 AI_BASE_URL |

## 🖼️ 图片生成

### 自拍（参考图编辑）
使用 `assets/reference.jpg` 作为基准照，每次自拍都基于这张图进行 AI 编辑，保持**同一张脸**。

你可以替换 `assets/reference.jpg` 为任何你喜欢的基准照，重启后生效。

### 场景照片（纯文生图）
拍猫、房间、办公室等不需要人脸的照片，使用纯文生图模式。

## 👩 自定义角色

编辑 `src/ai/character.js` 可以自定义：

- **外貌**：`appearance` 对象（发型、五官、身材、穿搭...）
- **人设**：`background` 字符串（职业、爱好、宠物、家庭环境...）
- **说话风格**：`speechPatterns` 数组
- **环境**：`home` / `office` / `pet` 对象

## 📁 项目结构

```
AI_Girlfriend/
├── index.js                 # 入口文件
├── assets/
│   └── reference.jpg        # 自拍基准照
├── src/
│   ├── ai/
│   │   ├── character.js     # 角色人设系统
│   │   ├── manager.js       # AI 管理器（回复生成、记忆）
│   │   ├── chatHistory.js   # 对话历史持久化
│   │   ├── selfie.js        # 图片生成（自拍 + 场景照）
│   │   └── scheduler.js     # 主动关怀调度器
│   ├── openai/
│   │   └── client.js        # AI API 客户端（多服务商）
│   ├── wechat/
│   │   └── handler.js       # 微信消息处理
│   └── utils/
│       └── logger.js        # 日志工具
├── .env.example             # 配置模板
├── package.json
└── README.md
```

## ⚠️ 安全提示

> **强烈建议使用微信小号运行！** 使用微信机器人存在一定风险。

本项目基于 Web 微信协议（wechaty-puppet-wechat4u），使用时请注意：

1. **用小号** — 不要用主力微信号
2. **设置 TARGET_USER** — 只回复特定的人，不要自动回复所有人
3. **不要 24h 挂机** — 需要的时候再开，用完就关
4. **控制频率** — 代码已内置打字延迟，不会秒回
5. **不要群发** — 避免在群里大量自动回复

## 🤝 致谢

本项目集成了以下开源项目的思路和功能：

- [wechaty](https://github.com/wechaty/wechaty) — 微信机器人 SDK
- [clawra](https://github.com/SumeLabs/clawra) — AI 自拍生成灵感
- [wxpy](https://github.com/youfou/wxpy) — Python 微信 API 参考

## 📄 License

MIT