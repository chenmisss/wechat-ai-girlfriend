// 自拍图片生成模块
// 使用豆包 Seedream API + 参考图编辑，保持每张自拍都是同一个人
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// 是否启用自拍功能
const SELFIE_ENABLED = !!process.env.DOUBAO_IMAGE_API_KEY;

// 加载参考图为 base64（只加载一次，缓存在内存中）
let referenceImageBase64 = null;
const REFERENCE_IMAGE_PATH = path.join(__dirname, '../../assets/reference.jpg');

const loadReferenceImage = () => {
    if (referenceImageBase64) return referenceImageBase64;
    try {
        const imgBuffer = fs.readFileSync(REFERENCE_IMAGE_PATH);
        referenceImageBase64 = 'data:image/jpeg;base64,' + imgBuffer.toString('base64');
        logger.info(`✅ 参考图已加载: ${REFERENCE_IMAGE_PATH} (${(imgBuffer.length / 1024).toFixed(0)}KB)`);
        return referenceImageBase64;
    } catch (error) {
        logger.error(`❌ 参考图加载失败: ${error.message}`);
        return null;
    }
};

if (SELFIE_ENABLED) {
    logger.info('✅ 自拍功能已启用（豆包 Seedream 参考图编辑）');
    loadReferenceImage();
} else {
    logger.info('ℹ️  自拍功能未启用（需要配置 DOUBAO_IMAGE_API_KEY）');
}

// 自拍模式关键词检测
const detectMode = (userContext) => {
    const mirrorKeywords = /穿|衣服|裙子|外套|时尚|全身|镜子|outfit|wearing|dress/i;
    const directKeywords = /咖啡|餐厅|海边|公园|城市|近景|自拍|脸|笑|cafe|beach|park/i;

    if (directKeywords.test(userContext)) return 'direct';
    if (mirrorKeywords.test(userContext)) return 'mirror';
    return 'direct';
};

// 根据用户消息推断场景（使用角色的固定环境描述）
const inferScene = (userContext) => {
    const { character } = require('./character');
    const sp = character.scenePrompts;

    const sceneMap = [
        [/猫|团团|喵|cat/i, sp.withCat],
        [/厨房|做饭|烘焙|烤箱|cook|bak/i, sp.kitchen],
        [/床|睡|起床|卧室|morning|bed/i, sp.bedroom],
        [/上班|办公|工位|公司|iMac|work|office/i, sp.office],
        [/咖啡|奶茶|星巴克|cafe/i, 'at a cozy cafe with a cup of milk tea'],
        [/海边|沙滩|beach/i, 'at the beach with ocean background'],
        [/公园|散步|park/i, 'in a beautiful park with trees and flowers'],
        [/逛街|商场|mall/i, 'at a shopping mall, holding shopping bags'],
        [/穿|衣服|裙子|外套|outfit/i, sp.home + ', showing off her outfit in front of a mirror'],
        [/你在干嘛|干什么|在做什么/i, sp.home + ', relaxing on the cream sofa'],
        [/下班/i, 'walking on a city street in the evening, warm sunset light'],
    ];

    for (const [pattern, scene] of sceneMap) {
        if (pattern.test(userContext)) return scene;
    }
    return sp.home;
};

// 构建图片编辑提示词（让模型基于参考图做修改）
const buildPrompt = (userContext, mode) => {
    const scene = inferScene(userContext || '');

    if (mode === 'mirror') {
        return `make this same person taking a mirror selfie, ${scene}, full body visible, phone in hand, keep the same face and features, no text, no watermark, photorealistic`;
    }
    return `make this same person taking a close-up selfie, ${scene}, direct eye contact with camera, sweet smile, phone held at arm's length, face clearly visible, keep the same face and features, no text, no watermark, photorealistic`;
};

// 生成自拍图片（通过豆包 Seedream API + 参考图编辑）
const generateSelfie = async (context) => {
    if (!SELFIE_ENABLED) {
        logger.warn('自拍功能未启用');
        return null;
    }

    const refImage = loadReferenceImage();
    if (!refImage) {
        logger.error('参考图未找到，无法生成自拍');
        return null;
    }

    try {
        const mode = detectMode(context || '');
        const prompt = buildPrompt(context || '', mode);
        const model = process.env.DOUBAO_IMAGE_MODEL || 'doubao-seedream-4-5-251128';

        logger.info(`生成自拍(参考图编辑): mode=${mode}`);
        logger.info(`prompt: "${prompt}"`);

        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DOUBAO_IMAGE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                image_urls: [refImage],  // 传入参考图，保持同一张脸
                response_format: 'url',
                size: '1920x1920',
                watermark: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`豆包 API 返回 ${response.status}: ${errorBody}`);
        }

        const result = await response.json();
        const imageUrl = result.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error('未获取到生成的图片URL');
        }

        logger.info(`自拍生成成功: ${imageUrl}`);
        return imageUrl;
    } catch (error) {
        logger.error('生成自拍失败:', error.message || JSON.stringify(error));
        return null;
    }
};

// 将图片 URL 下载为本地临时文件（用于微信发送）
const downloadToTemp = async (imageUrl) => {
    const os = require('os');

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`下载失败: ${response.status}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        const tempPath = path.join(os.tmpdir(), `selfie_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, buffer);

        logger.info(`图片已下载到临时文件: ${tempPath}`);
        return tempPath;
    } catch (error) {
        logger.error('下载图片失败:', error.message);
        return null;
    }
};

// 推断场景照片的 prompt（纯文生图，无需人脸）
const inferScenePrompt = (text) => {
    const { character } = require('./character');
    const sp = character.scenePrompts;

    const sceneMap = [
        [/团团|猫|喵/i, `a chubby orange tabby cat with white paws and round amber eyes, ${sp.home}, the cat is sitting on the cream sofa looking adorable, photorealistic, no text, no watermark`],
        [/房间|家|客厅|你家/i, `${sp.home}, cozy lived-in apartment, potted plants, photo frames on wall, photorealistic, no text, no watermark`],
        [/卧室|床/i, `${sp.bedroom}, cozy and tidy, photorealistic, no text, no watermark`],
        [/厨房|做饭|烘焙|蛋糕/i, `${sp.kitchen}, freshly baked pastry on counter, photorealistic, no text, no watermark`],
        [/办公|工位|公司|桌/i, `${sp.office}, a creative designer workspace, photorealistic, no text, no watermark`],
        [/窗外|外面|风景/i, `view from a 6th floor apartment window, city rooftop scenery, warm sunset light, photorealistic, no text, no watermark`],
    ];

    for (const [pattern, prompt] of sceneMap) {
        if (pattern.test(text)) return prompt;
    }
    return `${sp.home}, photorealistic, no text, no watermark`;
};

// 生成场景照片（纯文生图，不使用参考图）
const generateScenePhoto = async (context) => {
    if (!SELFIE_ENABLED) {
        logger.warn('图片功能未启用');
        return null;
    }

    try {
        const prompt = inferScenePrompt(context || '');
        const model = process.env.DOUBAO_IMAGE_MODEL || 'doubao-seedream-4-5-251128';

        logger.info(`生成场景照片: prompt="${prompt}"`);

        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DOUBAO_IMAGE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                response_format: 'url',
                size: '1920x1920',
                watermark: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`豆包 API 返回 ${response.status}: ${errorBody}`);
        }

        const result = await response.json();
        const imageUrl = result.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error('未获取到生成的图片URL');
        }

        logger.info(`场景照片生成成功: ${imageUrl}`);
        return imageUrl;
    } catch (error) {
        logger.error('生成场景照片失败:', error.message || JSON.stringify(error));
        return null;
    }
};

module.exports = {
    generateSelfie,
    generateScenePhoto,
    downloadToTemp,
    SELFIE_ENABLED,
};
