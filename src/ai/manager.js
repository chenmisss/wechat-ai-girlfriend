// AI 管理器 — 增强版
// 模拟真人回复：打字延迟、情绪感知、记忆注入
const { generateSystemPrompt, getCurrentTimePeriod } = require('./character');
const chatHistory = require('./chatHistory');
const openaiClient = require('../openai/client');
const logger = require('../utils/logger');

// 模拟打字延迟（让回复更真实）
const simulateTypingDelay = (text) => {
  // 每个字大约 80-150ms 的打字速度，加上思考时间
  const baseDelay = Math.min(text.length * 100, 3000); // 最长3秒
  const thinkingDelay = Math.random() * 2000 + 500;    // 0.5-2.5秒思考
  return Math.floor(baseDelay + thinkingDelay);
};

// 分析用户消息中的关键信息并记住
const extractAndRemember = (userId, userInput) => {
  const patterns = [
    { regex: /我叫(.{1,10})/, key: '名字' },
    { regex: /我的名字是(.{1,10})/, key: '名字' },
    { regex: /我(\d{1,2})岁/, key: '年龄' },
    { regex: /我的生日是(.{3,15})/, key: '生日' },
    { regex: /我生日(.{3,15})/, key: '生日' },
    { regex: /我在(.{2,10})工作/, key: '工作城市' },
    { regex: /我住在(.{2,10})/, key: '居住地' },
    { regex: /我是做(.{2,15})的/, key: '职业' },
    { regex: /我喜欢吃(.{1,10})/, key: '喜欢的食物' },
    { regex: /我喜欢(.{1,15})/, key: '喜好' },
    { regex: /我养了(.{1,10})/, key: '宠物' },
  ];

  for (const { regex, key } of patterns) {
    const match = userInput.match(regex);
    if (match) {
      chatHistory.rememberAboutUser(userId, key, match[1].trim());
    }
  }
};

// 检测是否是自拍请求（需要出现人脸 → 使用参考图编辑）
const isSelfieRequest = (text) => {
  const selfieKeywords = [
    '发张照片', '发个照片', '发张自拍', '发个自拍',
    '看看你', '给我看看你', '你长什么样',
    '发张图', '发个图', '拍张照',
    '想看你', '给我发照片', '发一张',
    '你在干嘛', '你在干啥', '在干嘛呢',
    '想看看你', '让我看看',
  ];
  return selfieKeywords.some(keyword => text.includes(keyword));
};

// 检测是否是场景拍照请求（不需要人脸 → 纯文生图）
const isScenePhotoRequest = (text) => {
  const sceneKeywords = [
    '团团', '看看猫', '猫咪照片', '猫的照片',
    '家里照片', '你的房间', '看看你家', '你房间什么样',
    '办公室照片', '工位照片', '公司什么样',
    '窗外', '看看外面', '拍个风景',
    '你做的菜', '你做的饭', '烘焙', '蛋糕照片',
    '桌面', '你的桌子',
  ];
  return sceneKeywords.some(keyword => text.includes(keyword));
};

// 检测特殊命令
const parseCommand = (text) => {
  const trimmed = text.trim();
  if (trimmed === '/清除记忆' || trimmed === '/清空记忆' || trimmed === '/重置') {
    return { type: 'clearHistory' };
  }
  if (trimmed === '/状态' || trimmed === '/info') {
    return { type: 'status' };
  }
  if (trimmed === '/帮助' || trimmed === '/help') {
    return { type: 'help' };
  }
  return null;
};

// 生成AI回复
const generateReply = async (userInput, userId) => {
  try {
    logger.info(`用户 ${userId} 输入: ${userInput}`);

    // 检查特殊命令
    const command = parseCommand(userInput);
    if (command) {
      return handleCommand(command, userId);
    }

    // 提取并记住用户信息
    extractAndRemember(userId, userInput);

    // 添加用户输入到对话历史
    chatHistory.addMessage(userId, 'user', userInput);

    // 构建完整的对话消息（包含记忆）
    const memoryPrompt = chatHistory.getUserMemoryPrompt(userId);
    const systemPrompt = generateSystemPrompt() + memoryPrompt;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.getHistory(userId)
    ];

    // 调用AI生成回复
    const reply = await openaiClient.generateResponse(messages);

    // 添加AI回复到对话历史
    chatHistory.addMessage(userId, 'assistant', reply);

    logger.info(`AI 回复 ${userId}: ${reply}`);

    return reply;
  } catch (error) {
    logger.error(`生成回复时出错 (用户: ${userId}):`, error);

    // 根据不同错误返回不同的友好提示
    if (error.status === 429) {
      return '等一下嘛，我脑子转不过来了😵‍💫';
    }
    return '啊...信号不太好的样子，你再说一遍？😅';
  }
};

// 处理特殊命令
const handleCommand = (command, userId) => {
  switch (command.type) {
    case 'clearHistory':
      chatHistory.clearHistory(userId);
      return '好的，我把之前的聊天记录都忘掉啦～我们重新开始吧😊';
    case 'status':
      const history = chatHistory.getHistory(userId);
      const memory = chatHistory.getUserMemory(userId);
      const memoryKeys = Object.keys(memory);
      return `📊 当前状态\n对话记录: ${history.length}条\n记住的信息: ${memoryKeys.length}条\nAI模型: ${openaiClient.modelName}\n时间段: ${getCurrentTimePeriod()}`;
    case 'help':
      return `🔧 可用命令\n/清除记忆 - 清空对话历史\n/状态 - 查看当前状态\n/帮助 - 显示此帮助`;
    default:
      return null;
  }
};

// 清空用户对话历史
const clearUserHistory = (userId) => {
  chatHistory.clearHistory(userId);
  logger.info(`已清空用户 ${userId} 的对话历史`);
};

// 获取打字延迟
const getTypingDelay = (text) => {
  return simulateTypingDelay(text);
};

module.exports = {
  generateReply,
  clearUserHistory,
  getTypingDelay,
  isSelfieRequest,
  isScenePhotoRequest,
};