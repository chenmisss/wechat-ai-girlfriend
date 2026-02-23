require('dotenv').config();
const { WechatyBuilder } = require('wechaty');
const { PuppetWechat4u } = require('wechaty-puppet-wechat4u');
const express = require('express');
const logger = require('./src/utils/logger');
const wechatHandler = require('./src/wechat/handler');
const { character } = require('./src/ai/character');
const { provider, modelName } = require('./src/openai/client');

const app = express();
const PORT = process.env.PORT || 3000;

// === 启动信息 ===
console.log('\n');
console.log('╔════════════════════════════════════════╗');
console.log('║     💕 微信AI女友机器人 — 增强版       ║');
console.log('╠════════════════════════════════════════╣');
console.log(`║  👩 角色: ${character.name.padEnd(28)}║`);
console.log(`║  🤖 AI模型: ${(provider + ' / ' + modelName).padEnd(25)}║`);
console.log(`║  🌐 端口: ${String(PORT).padEnd(28)}║`);
console.log('╚════════════════════════════════════════╝');
console.log('\n');

// 初始化微信机器人
const puppet = new PuppetWechat4u({});

const bot = WechatyBuilder.build({
  name: 'AI-Girlfriend',
  puppet
});

// 注册微信事件处理器
bot.on('scan', wechatHandler.onScan);
bot.on('login', wechatHandler.onLogin);
bot.on('logout', wechatHandler.onLogout);
bot.on('message', wechatHandler.onMessage);

// 错误事件处理
bot.on('error', (error) => {
  logger.error('Wechaty 错误:', error.message);
});

// 启动微信机器人
bot.start()
  .then(() => {
    logger.info('微信机器人启动成功！正在等待扫码登录...');
    console.log('📱 正在生成登录二维码，请稍候...\n');
  })
  .catch(error => {
    logger.error('微信机器人启动失败:', error);
    console.error('\n❌ 启动失败! 请检查:');
    console.error('  1. 网络连接是否正常');
    console.error('  2. Node.js 版本是否 >= 16');
    console.error('  3. 依赖是否已安装 (npm install)\n');
    process.exit(1);
  });

// 启动Express服务器（用于健康检查）
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    character: character.name,
    aiModel: `${provider}/${modelName}`,
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  logger.info(`Express服务器启动成功，监听端口: ${PORT}`);
});

// 优雅退出
const gracefulShutdown = async (signal) => {
  console.log(`\n收到 ${signal} 信号，正在优雅退出...`);
  try {
    await bot.stop();
    logger.info('微信机器人已停止');
  } catch (e) {
    // 忽略停止时的错误
  }
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});