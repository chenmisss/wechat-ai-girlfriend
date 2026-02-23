// AI 客户端 — 增强版
// 支持多种 AI 模型后端，统一通过 OpenAI 兼容接口调用
const OpenAI = require('openai');
const logger = require('../utils/logger');

// 预设的 AI 服务商配置
const PROVIDERS = {
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  // 硅基流动（国内中转，支持多种模型）
  siliconflow: {
    baseURL: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
  },
  // 零一万物
  lingyiwanwu: {
    baseURL: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-lightning',
  },
  // xAI (Grok)
  xai: {
    baseURL: 'https://api.x.ai/v1',
    defaultModel: 'grok-4-1-fast-non-reasoning',
  },
  // 自定义（用户填 BASE_URL）
  custom: {
    baseURL: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
    defaultModel: process.env.AI_MODEL || 'llama3',
  },
};

// 确定使用的 AI 服务商
const provider = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();
const config = PROVIDERS[provider] || PROVIDERS.custom;

// 初始化客户端（用占位key避免SDK启动时报错，实际调用时才需要真实key）
const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || 'sk-placeholder';
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: process.env.AI_BASE_URL || config.baseURL,
});

if (apiKey === 'sk-placeholder' || apiKey === 'your_api_key_here' || apiKey === 'your_deepseek_api_key') {
  logger.warn('⚠️  AI API密钥未配置！请编辑 .env 文件填入真实的 API 密钥');
}

const modelName = process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || config.defaultModel;

logger.info(`AI 后端: ${provider} | 模型: ${modelName} | API: ${process.env.AI_BASE_URL || config.baseURL}`);

// 调用 AI API 生成回复
const generateResponse = async (messages) => {
  try {
    logger.debug('调用AI API, 消息条数:', messages.length);

    // 构建请求参数
    const requestParams = {
      model: modelName,
      messages: messages,
      temperature: parseFloat(process.env.AI_TEMPERATURE || process.env.DEEPSEEK_TEMPERATURE || '0.85'),
      max_tokens: parseInt(process.env.AI_MAX_TOKENS || '300'),
    };

    // xAI (Grok) 不支持 presence_penalty / frequency_penalty
    if (provider !== 'xai') {
      requestParams.presence_penalty = 0.6;   // 鼓励多样性
      requestParams.frequency_penalty = 0.3;  // 减少重复
    }

    const completion = await client.chat.completions.create(requestParams);

    const response = completion.choices[0].message.content.trim();
    logger.debug('AI回复:', response);

    return response;
  } catch (error) {
    logger.error('调用AI API时出错:', error.message);

    // 更友好的错误处理
    if (error.status === 401) {
      logger.error('API密钥无效，请检查 .env 文件中的 AI_API_KEY 配置');
    } else if (error.status === 429) {
      logger.error('API调用频率过高，请稍后重试');
    } else if (error.code === 'ECONNREFUSED') {
      logger.error('无法连接到AI服务，请检查网络和 AI_BASE_URL 配置');
    }

    throw error;
  }
};

module.exports = {
  generateResponse,
  provider,
  modelName
};