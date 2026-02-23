// 对话历史管理器 — 增强版
// 持久化到文件，重启不丢失；支持记住重要信息
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// 数据存储目录（跨平台兼容）
const DATA_DIR = path.join(__dirname, '../../data');
const HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const MEMORY_FILE = path.join(DATA_DIR, 'user_memory.json');

class ChatHistory {
  constructor(maxHistoryLength = 30) {
    this.maxHistoryLength = maxHistoryLength;
    this.histories = new Map();
    this.userMemory = new Map(); // 记住关于用户的重要信息

    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 从文件加载历史数据
    this._loadFromFile();
  }

  // 添加消息到对话历史
  addMessage(userId, role, content) {
    if (!this.histories.has(userId)) {
      this.histories.set(userId, []);
    }

    const history = this.histories.get(userId);
    history.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    // 限制历史记录长度
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }

    // 自动保存
    this._saveToFile();
  }

  // 获取用户的对话历史（返回给 API 的格式，不含时间戳）
  getHistory(userId) {
    const history = this.histories.get(userId) || [];
    return history.map(({ role, content }) => ({ role, content }));
  }

  // 获取最近的对话摘要（用于系统提示词补充）
  getRecentSummary(userId, count = 5) {
    const history = this.histories.get(userId) || [];
    return history.slice(-count);
  }

  // 清空用户的对话历史
  clearHistory(userId) {
    if (this.histories.has(userId)) {
      this.histories.delete(userId);
      this._saveToFile();
    }
  }

  // === 用户记忆系统 ===

  // 记住关于用户的信息
  rememberAboutUser(userId, key, value) {
    if (!this.userMemory.has(userId)) {
      this.userMemory.set(userId, {});
    }
    const memory = this.userMemory.get(userId);
    memory[key] = {
      value,
      updatedAt: new Date().toISOString()
    };
    this._saveMemoryToFile();
    logger.info(`记住了用户 ${userId} 的信息: ${key} = ${value}`);
  }

  // 获取关于用户的记忆
  getUserMemory(userId) {
    return this.userMemory.get(userId) || {};
  }

  // 获取记忆的文本描述（注入到提示词中）
  getUserMemoryPrompt(userId) {
    const memory = this.getUserMemory(userId);
    const entries = Object.entries(memory);
    if (entries.length === 0) return '';

    const lines = entries.map(([key, { value }]) => `- ${key}: ${value}`);
    return `\n## 你记住的关于对方的信息\n${lines.join('\n')}`;
  }

  // === 文件持久化 ===

  _loadFromFile() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        for (const [userId, history] of Object.entries(data)) {
          this.histories.set(userId, history);
        }
        logger.info(`从文件加载了 ${this.histories.size} 个用户的对话历史`);
      }
    } catch (error) {
      logger.error('加载对话历史文件失败:', error.message);
    }

    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
        for (const [userId, memory] of Object.entries(data)) {
          this.userMemory.set(userId, memory);
        }
        logger.info(`从文件加载了 ${this.userMemory.size} 个用户的记忆数据`);
      }
    } catch (error) {
      logger.error('加载用户记忆文件失败:', error.message);
    }
  }

  _saveToFile() {
    try {
      const data = Object.fromEntries(this.histories);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('保存对话历史文件失败:', error.message);
    }
  }

  _saveMemoryToFile() {
    try {
      const data = Object.fromEntries(this.userMemory);
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('保存用户记忆文件失败:', error.message);
    }
  }
}

module.exports = new ChatHistory();