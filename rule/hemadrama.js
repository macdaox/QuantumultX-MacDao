/**
 * 河马短剧去广告重写脚本
 * 功能：屏蔽河马短剧APP中的广告内容
 * 使用方法：在QuantumultX中添加重写规则
 * 
 * 重写规则示例：
 * ^https?://.*\.hemadrama\.com/.*ad.*$ url script-response-body rewrite/app-specific/hemadrama.js
 * ^https?://api\.hemadrama\.com/.*advertisement.*$ url script-response-body rewrite/app-specific/hemadrama.js
 */

// 河马短剧广告相关的API端点
const hemaAdEndpoints = [
    '/api/advertisement',
    '/api/ad',
    '/api/banner',
    '/api/promotion',
    '/api/sponsor',
    '/api/popup',
    '/api/splash',
    '/api/startup',
    '/api/feed/ad',
    '/api/video/ad',
    '/api/player/ad'
];

// 河马短剧广告域名
const hemaAdDomains = [
    'hemadrama.com',
    'api.hemadrama.com',
    'ad.hemadrama.com',
    'ads.hemadrama.com'
];

// 检查是否为河马短剧广告请求
function isHemaAdRequest(url) {
    // 检查域名
    const isHemaDomain = hemaAdDomains.some(domain => url.includes(domain));
    
    // 检查API端点
    const isAdEndpoint = hemaAdEndpoints.some(endpoint => url.includes(endpoint));
    
    // 检查URL中的广告关键词
    const adKeywords = ['advertisement', 'ad', 'banner', 'promotion', 'sponsor', 'popup', 'splash'];
    const hasAdKeyword = adKeywords.some(keyword => url.toLowerCase().includes(keyword));
    
    return isHemaDomain && (isAdEndpoint || hasAdKeyword);
}

// 处理河马短剧广告请求
function handleHemaAdRequest(request) {
    const url = request.url;
    
    if (isHemaAdRequest(url)) {
        console.log(`[河马短剧去广告] 屏蔽广告请求: ${url}`);
        
        // 返回空的JSON响应
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                code: 0,
                message: 'success',
                data: [],
                ads: [],
                advertisements: []
            })
        };
    }
    
    return request;
}

// 处理河马短剧响应内容
function handleHemaResponse(response) {
    if (!response.body) {
        return response;
    }
    
    let body = response.body;
    
    try {
        // 如果是JSON响应，尝试解析并移除广告数据
        if (response.headers['content-type'] && 
            response.headers['content-type'].includes('application/json')) {
            
            const data = JSON.parse(body);
            
            // 递归移除广告相关字段
            function removeAdFields(obj) {
                if (typeof obj !== 'object' || obj === null) {
                    return obj;
                }
                
                if (Array.isArray(obj)) {
                    return obj.map(item => removeAdFields(item)).filter(item => {
                        // 过滤掉广告项
                        if (typeof item === 'object' && item !== null) {
                            const itemStr = JSON.stringify(item).toLowerCase();
                            const adKeywords = ['advertisement', 'ad', 'banner', 'promotion', 'sponsor', 'popup'];
                            return !adKeywords.some(keyword => itemStr.includes(keyword));
                        }
                        return true;
                    });
                }
                
                const newObj = {};
                for (const [key, value] of Object.entries(obj)) {
                    const lowerKey = key.toLowerCase();
                    // 跳过广告相关字段
                    if (!['advertisement', 'ads', 'ad', 'banner', 'promotion', 'sponsor', 'popup', 'splash'].includes(lowerKey)) {
                        newObj[key] = removeAdFields(value);
                    }
                }
                return newObj;
            }
            
            const cleanedData = removeAdFields(data);
            return {
                ...response,
                body: JSON.stringify(cleanedData)
            };
        }
    } catch (e) {
        // 如果不是JSON或解析失败，继续处理HTML内容
    }
    
    // 处理HTML内容中的广告
    const hemaAdPatterns = [
        // 开屏广告
        /<div[^>]*class="[^"]*splash[^"]*"[^>]*>.*?<\/div>/gi,
        /<div[^>]*id="[^"]*splash[^"]*"[^>]*>.*?<\/div>/gi,
        
        // 横幅广告
        /<div[^>]*class="[^"]*banner[^"]*"[^>]*>.*?<\/div>/gi,
        /<div[^>]*id="[^"]*banner[^"]*"[^>]*>.*?<\/div>/gi,
        
        // 弹窗广告
        /<div[^>]*class="[^"]*popup[^"]*"[^>]*>.*?<\/div>/gi,
        /<div[^>]*id="[^"]*popup[^"]*"[^>]*>.*?<\/div>/gi,
        
        // 视频广告
        /<div[^>]*class="[^"]*video-ad[^"]*"[^>]*>.*?<\/div>/gi,
        /<div[^>]*id="[^"]*video-ad[^"]*"[^>]*>.*?<\/div>/gi,
        
        // 通用广告标签
        /<div[^>]*class="[^"]*advertisement[^"]*"[^>]*>.*?<\/div>/gi,
        /<div[^>]*class="[^"]*promotion[^"]*"[^>]*>.*?<\/div>/gi,
        /<div[^>]*class="[^"]*sponsor[^"]*"[^>]*>.*?<\/div>/gi,
        
        // 广告脚本
        /<script[^>]*src="[^"]*ad[^"]*"[^>]*>.*?<\/script>/gi,
        /<script[^>]*>.*?advertisement.*?<\/script>/gi,
        /<script[^>]*>.*?banner.*?<\/script>/gi
    ];
    
    hemaAdPatterns.forEach(pattern => {
        body = body.replace(pattern, '');
    });
    
    return {
        ...response,
        body: body
    };
}

// 主处理函数
function handleRequest(request) {
    return handleHemaAdRequest(request);
}

function handleResponse(response) {
    return handleHemaResponse(response);
}

// 导出处理函数
module.exports = {
    handleRequest,
    handleResponse
};