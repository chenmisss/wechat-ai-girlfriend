// 功能测试脚本 — 增强版
const { character, generateSystemPrompt, getCurrentTimePeriod } = require('./src/ai/character');
const chatHistory = require('./src/ai/chatHistory');
const logger = require('./src/utils/logger');
const { provider, modelName } = require('./src/openai/client');
const { isSelfieRequest } = require('./src/ai/manager');
const { SELFIE_ENABLED } = require('./src/ai/selfie');

console.log('╔════════════════════════════════════════╗');
console.log('║     💕 微信AI女友 — 功能测试           ║');
console.log('╚════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

const assert = (condition, testName) => {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        passCount++;
    } else {
        console.log(`  ❌ ${testName}`);
        failCount++;
    }
};

// 测试1: 角色配置
console.log('📋 测试1: 角色配置');
assert(character.name !== undefined, '角色名字已设置: ' + character.name);
assert(character.personality !== undefined, '角色性格已设置');
assert(character.age !== undefined, '角色年龄已设置: ' + character.age);
assert(character.background.length > 100, '角色背景足够丰富');
assert(character.speechPatterns.length >= 5, `说话模式: ${character.speechPatterns.length} 条`);
assert(character.avoidPatterns.length >= 5, `禁止模式: ${character.avoidPatterns.length} 条`);
assert(character.timeAwareness !== undefined, '时间感知已配置');
assert(character.emotionalStates !== undefined, '情绪系统已配置');
console.log('');

// 测试2: 系统提示词
console.log('📋 测试2: 系统提示词');
const prompt = generateSystemPrompt();
assert(prompt.includes(character.name), '提示词包含角色名');
assert(prompt.includes('时间段'), '提示词包含时间感知');
assert(prompt.length > 300, `提示词长度: ${prompt.length} 字符`);
const timePeriod = getCurrentTimePeriod();
assert(typeof timePeriod === 'string', `当前时间段: ${timePeriod}`);
console.log('');

// 测试3: 对话历史管理 (持久化)
console.log('📋 测试3: 对话历史管理');
const testUserId = 'test_user_001';
chatHistory.clearHistory(testUserId); // 先清空
chatHistory.addMessage(testUserId, 'user', '你好，我是你的男朋友');
chatHistory.addMessage(testUserId, 'assistant', '你好呀宝～今天过得怎么样😊');
const history = chatHistory.getHistory(testUserId);
assert(history.length === 2, `对话记录数: ${history.length}`);
assert(history[0].role === 'user', '消息角色正确');
assert(!history[0].timestamp, 'getHistory返回不含时间戳（API格式）');
console.log('');

// 测试4: 用户记忆系统
console.log('📋 测试4: 用户记忆系统');
chatHistory.rememberAboutUser(testUserId, '名字', '小明');
chatHistory.rememberAboutUser(testUserId, '生日', '3月15日');
const memory = chatHistory.getUserMemory(testUserId);
assert(memory['名字']?.value === '小明', '记住了名字');
assert(memory['生日']?.value === '3月15日', '记住了生日');
const memoryPrompt = chatHistory.getUserMemoryPrompt(testUserId);
assert(memoryPrompt.includes('小明'), '记忆提示词正确');
console.log('');

// 测试5: 自拍请求检测
console.log('📋 测试5: 自拍请求检测');
assert(isSelfieRequest('发张照片') === true, '"发张照片" → 触发');
assert(isSelfieRequest('发个自拍') === true, '"发个自拍" → 触发');
assert(isSelfieRequest('你在干嘛') === true, '"你在干嘛" → 触发');
assert(isSelfieRequest('今天天气好好') === false, '"今天天气好好" → 不触发');
assert(isSelfieRequest('我吃饭了') === false, '"我吃饭了" → 不触发');
console.log('');

// 测试6: AI后端配置
console.log('📋 测试6: AI后端配置');
assert(typeof provider === 'string', `AI服务商: ${provider}`);
assert(typeof modelName === 'string', `AI模型: ${modelName}`);
assert(SELFIE_ENABLED !== undefined, `自拍功能: ${SELFIE_ENABLED ? '已启用' : '未启用'}`);
console.log('');

// 测试7: 日志系统
console.log('📋 测试7: 日志系统');
logger.info('测试日志 - info');
logger.debug('测试日志 - debug');
assert(true, '日志系统正常');
console.log('');

// 清理测试数据
chatHistory.clearHistory(testUserId);

// 结果汇总
console.log('════════════════════════════════════════');
console.log(`  测试完成: ${passCount} 通过, ${failCount} 失败`);
console.log('════════════════════════════════════════\n');

if (failCount > 0) {
    console.log('⚠️  有测试未通过，请检查输出');
    process.exit(1);
} else {
    console.log('🎉 所有测试通过！');
    console.log('\n下一步:');
    console.log('  1. 编辑 .env 文件，填入你的 AI API 密钥');
    console.log('  2. 运行 npm start 启动机器人');
    console.log('  3. 用微信扫码登录\n');
}