// 微信消息事件处理器 — 增强版
// 模拟真人交互：打字延迟、消息类型判断、自拍触发
const logger = require('../utils/logger');
const aiManager = require('../ai/manager');
const selfie = require('../ai/selfie');
const scheduler = require('../ai/scheduler');
const { FileBox } = require('file-box');

// 目标用户（只回复特定人的消息，留空则回复所有人）
const TARGET_USER = process.env.TARGET_USER || '';

// 扫码登录事件处理
const onScan = (qrcode, status) => {
  // status: 0=等待扫码, 2=已扫码等待确认, 3=已确认
  const statusText = {
    0: '等待扫码',
    2: '已扫码，请在手机上确认',
    3: '登录确认中...',
  };
  const qrCodeUrl = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;

  console.log('\n========================================');
  console.log(`  📱 ${statusText[status] || `状态: ${status}`}`);
  console.log('  请用微信扫描以下链接中的二维码:');
  console.log(`  ${qrCodeUrl}`);
  console.log('========================================\n');

  logger.info(`扫码状态: ${status}, URL: ${qrCodeUrl}`);
};

// 登录事件处理
const onLogin = async (user) => {
  const name = user.name();
  console.log('\n✅ ========================================');
  console.log(`  微信机器人登录成功: ${name}`);
  console.log('  AI女友已上线，等待消息中...');
  console.log('==========================================\n');

  logger.info(`微信机器人登录成功: ${name}`);

  // 初始化主动关怀调度器
  scheduler.init(user.wechaty);

  // 如果设置了目标用户，尝试找到并设置为调度器目标
  if (TARGET_USER) {
    try {
      const contact = await user.wechaty.Contact.find({ name: TARGET_USER });
      if (contact) {
        scheduler.setTargetContact(contact);
        logger.info(`已设置主动关怀目标: ${TARGET_USER}`);
      }
    } catch (err) {
      logger.warn(`未找到目标用户 "${TARGET_USER}":`, err.message);
    }
  }
};

// 登出事件处理
const onLogout = async (user, reason) => {
  console.log(`\n❌ 微信机器人已登出: ${user.name()}`);
  logger.info(`微信机器人登出: ${user.name()}, 原因: ${reason}`);
  scheduler.stop();
};

// 消息事件处理
const onMessage = async (message) => {
  try {
    const from = message.talker();
    const content = message.text();
    const room = message.room();
    const self = message.wechaty.userSelf();
    const messageType = message.type();

    // 🔒 过滤自己发出的消息（防止死循环！）
    if (from.id === self.id) return;

    // 只处理文本消息（Type 7 = Text）
    if (messageType !== 7) {
      logger.debug(`跳过非文本消息, 类型: ${messageType}, 来自: ${from.name()}`);
      return;
    }

    // 忽略空消息
    if (!content || !content.trim()) return;

    // 如果设置了目标用户，只回复特定的人
    if (TARGET_USER && from.name() !== TARGET_USER) {
      // 如果是群消息中 @机器人，也允许回复
      if (!room) {
        logger.debug(`忽略非目标用户消息: ${from.name()}`);
        return;
      }
    }

    // === 群消息处理 ===
    if (room) {
      const topic = await room.topic();
      logger.info(`[群聊: ${topic}] ${from.name()}: ${content}`);

      // 仅当 @机器人时才回复
      if (content.includes(self.name()) || await message.mentionSelf()) {
        const cleanContent = content.replace(new RegExp(`@${self.name()}\\s*`, 'g'), '').trim();
        if (cleanContent) {
          const reply = await aiManager.generateReply(cleanContent, `group_${from.name()}`);

          // 模拟打字延迟
          const delay = aiManager.getTypingDelay(reply);
          await sleep(delay);

          await message.say(`@${from.name()} ${reply}`);
        }
      }
      return;
    }

    // === 私聊消息处理 ===
    logger.info(`[私聊] ${from.name()}: ${content}`);

    // 如果还没设置调度器目标，自动设置第一个私聊的人
    if (!scheduler.targetContact && scheduler.enabled) {
      scheduler.setTargetContact(from);
    }

    // 检查是否是场景拍照请求（团团、房间、办公室等，不含人脸）
    if (aiManager.isScenePhotoRequest(content)) {
      await handleScenePhotoRequest(message, from, content);
      return;
    }

    // 检查是否是自拍请求（包含人脸，使用参考图编辑）
    if (aiManager.isSelfieRequest(content)) {
      await handleSelfieRequest(message, from, content);
      return;
    }

    // 正常对话
    const reply = await aiManager.generateReply(content, from.name());

    // 模拟打字延迟（让回复更真实）
    const delay = aiManager.getTypingDelay(reply);
    logger.debug(`模拟打字延迟: ${delay}ms`);
    await sleep(delay);

    await message.say(reply);

  } catch (error) {
    logger.error('处理消息时出错:', error);
  }
};

// 处理自拍请求
const handleSelfieRequest = async (message, from, content) => {
  if (!selfie.SELFIE_ENABLED) {
    // 未配置图片生成，用文字代替
    const delay = aiManager.getTypingDelay('嘿嘿');
    await sleep(delay);
    await message.say('嘿嘿，我现在在家穿着睡衣呢，不好意思拍啦😝');
    return;
  }

  try {
    // 先发一条消息表示在拍照
    await message.say('等一下哦，我拍一张给你～📸');

    // 生成自拍
    const imageUrl = await selfie.generateSelfie(content);

    if (imageUrl) {
      // 下载到临时文件然后发送
      const tempPath = await selfie.downloadToTemp(imageUrl);
      if (tempPath) {
        const fileBox = FileBox.fromFile(tempPath);
        await message.say(fileBox);
        // 随机补一句
        const captions = [
          '看看，好看嘛😊',
          '拍了好几张选的这张！',
          '嘿嘿，怎么样～',
          '给你拍的哦❤️',
          '凑合看吧哈哈',
        ];
        const caption = captions[Math.floor(Math.random() * captions.length)];
        await sleep(1000);
        await message.say(caption);
      }
    } else {
      await message.say('啊...手机摄像头好像坏了😭 下次再拍给你吧');
    }
  } catch (error) {
    logger.error('发送自拍失败:', error);
    await message.say('拍了但是发不出去...信号太差了😅');
  }
};

// 处理场景拍照请求（团团、房间、办公室等）
const handleScenePhotoRequest = async (message, from, content) => {
  if (!selfie.SELFIE_ENABLED) {
    const delay = aiManager.getTypingDelay('嗯');
    await sleep(delay);
    await message.say('手机没电了拍不了😭 下次给你拍！');
    return;
  }

  try {
    // 根据内容自然回复
    const captions = {
      cat: ['看！团团今天超乖的🐱', '它又在犯困了哈哈', '这小胖子今天偷吃了我的零食😤'],
      room: ['我家虽然小但是很温馨吧～', '刚收拾完的！', '嘿嘿，还行吧'],
      office: ['这就是我的工位啦～', '今天办公室没什么人', '我的工位最乱哈哈'],
      kitchen: ['看我今天的成果！', '虽然卖相不行但味道还行...吧', '这次没翻车！'],
      default: ['给你拍了一张～', '看看！', '拍了一张哦'],
    };

    // 选择合适的caption
    let captionList = captions.default;
    if (/团团|猫|喵/.test(content)) captionList = captions.cat;
    else if (/房间|家|客厅/.test(content)) captionList = captions.room;
    else if (/办公|工位|公司/.test(content)) captionList = captions.office;
    else if (/厨房|烘焙|做饭|蛋糕/.test(content)) captionList = captions.kitchen;

    await message.say('等等哦，我拍一张📸');

    const imageUrl = await selfie.generateScenePhoto(content);

    if (imageUrl) {
      const tempPath = await selfie.downloadToTemp(imageUrl);
      if (tempPath) {
        const fileBox = FileBox.fromFile(tempPath);
        await message.say(fileBox);
        const caption = captionList[Math.floor(Math.random() * captionList.length)];
        await sleep(1000);
        await message.say(caption);
      }
    } else {
      await message.say('拍了但是太模糊了...手抖了😅');
    }
  } catch (error) {
    logger.error('发送场景照片失败:', error);
    await message.say('手机存储满了发不了图😅');
  }
};

// 辅助函数: 睡眠
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  onScan,
  onLogin,
  onLogout,
  onMessage
};