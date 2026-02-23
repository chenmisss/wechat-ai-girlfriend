// 主动关怀调度器
// 定时发送问候消息，模拟真实女友的关心
const logger = require('../utils/logger');
const { character } = require('./character');

class Scheduler {
    constructor() {
        this.timers = [];
        this.targetContact = null; // 目标联系人（女友要主动发消息的对象）
        this.bot = null;
        this.enabled = process.env.ENABLE_SCHEDULER === 'true';
    }

    // 初始化调度器
    init(bot) {
        this.bot = bot;

        if (!this.enabled) {
            logger.info('主动关怀调度器未启用（设置 ENABLE_SCHEDULER=true 开启）');
            return;
        }

        logger.info('主动关怀调度器已启动');
        this._startSchedule();
    }

    // 设置目标联系人
    setTargetContact(contact) {
        this.targetContact = contact;
        logger.info(`主动关怀目标: ${contact.name()}`);
    }

    // 启动定时任务
    _startSchedule() {
        // 每分钟检查一次是否需要发送消息
        const checkInterval = setInterval(() => {
            this._checkAndSend();
        }, 60 * 1000);

        this.timers.push(checkInterval);
    }

    // 检查是否需要发送消息
    async _checkAndSend() {
        if (!this.targetContact || !this.bot) return;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // 早安问候
        const morningTime = process.env.MORNING_GREETING_TIME || '08:00';
        const [morningH, morningM] = morningTime.split(':').map(Number);
        if (hours === morningH && minutes === morningM) {
            await this._sendGreeting('morning');
        }

        // 晚安问候
        const eveningTime = process.env.EVENING_GREETING_TIME || '22:30';
        const [eveningH, eveningM] = eveningTime.split(':').map(Number);
        if (hours === eveningH && minutes === eveningM) {
            await this._sendGreeting('evening');
        }

        // 午餐提醒
        if (hours === 12 && minutes === 0) {
            await this._sendGreeting('lunch');
        }
    }

    // 发送问候
    async _sendGreeting(type) {
        const greetings = {
            morning: [
                '早安呀宝～起床了没😘',
                '宝贝早上好呀～今天也要加油哦❤️',
                '起床啦起床啦！新的一天开始咯😊',
                '早～昨晚睡得好嘛？',
                '宝早安！今天天气怎么样呀',
            ],
            lunch: [
                '宝你吃午饭了吗？别忘了吃饭哦',
                '中午了！去吃饭啦，别饿着😋',
                '吃午饭了没呀～今天吃什么好呢',
                '该吃饭啦！不许不吃哦',
            ],
            evening: [
                '宝贝早点休息哦，明天还要上班呢😘',
                '晚安呀～做个好梦💤',
                '该睡觉了哦，不要熬夜嘛',
                '困了困了...宝你也早点睡吧，晚安❤️',
                '晚安宝贝，想你～明天见😘',
            ],
        };

        const messages = greetings[type] || greetings.morning;
        const message = messages[Math.floor(Math.random() * messages.length)];

        try {
            await this.targetContact.say(message);
            logger.info(`发送${type}问候: ${message}`);
        } catch (error) {
            logger.error(`发送${type}问候失败:`, error.message);
        }
    }

    // 停止所有定时任务
    stop() {
        this.timers.forEach(timer => clearInterval(timer));
        this.timers = [];
        logger.info('主动关怀调度器已停止');
    }
}

module.exports = new Scheduler();
