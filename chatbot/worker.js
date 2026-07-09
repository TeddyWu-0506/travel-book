// Cloudflare Worker for Travel Chatbot
export default {
  async fetch(request, env) {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { question } = await request.json();
      
      // Step 1: Search knowledge base
      const knowledgeContext = searchKnowledgeBase(question);
      
      // Step 2: Try DuckDuckGo search if needed
      let webContext = '';
      if (needsWebSearch(question)) {
        webContext = await searchDuckDuckGo(question);
      }
      
      // Step 3: Build prompt
      const systemPrompt = buildSystemPrompt(knowledgeContext, webContext);
      
      // Step 4: Call AI API
      const answer = await callAIAPI(question, systemPrompt, env);
      
      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal error',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Knowledge base search
function searchKnowledgeBase(question) {
  const knowledge = {
    trip_overview: {
      keywords: ['行程', '旅行', '越南', '岘港', '几天', '日期'],
      content: `这是一个7天6晚的越南岘港情侣旅行，从2026年7月11日（周六）到7月18日（周六）。
出发地是广州，目的地是越南岘港。行程包括：芒街1晚、岘港市区2晚、会安1晚、美溪海滩3晚。
总预算约8355元人民币（2人）。`
    },
    day1: {
      keywords: ['第一天', '7月11日', '广州', '南宁', '东兴', '芒街'],
      content: `Day 1（7月11日周六）：广州→芒街
- 09:00 广州南站出发
- 12:30 抵达南宁东，换乘
- 14:30 抵达东兴，口岸过关到芒街
- 晚上：芒街夜市宵夜
- 住宿：芒街天堂酒店（142元/晚）
- 注意：过关需30-60分钟，提前准备护照+签证`
    },
    day2: {
      keywords: ['第二天', '7月12日', '芒街', '岘港', '飞机', '航班'],
      content: `Day 2（7月12日周日）：芒街→岘港
- 12:00 芒街包车出发到吉碑机场（约3小时，260元）
- 15:00 抵达海防吉碑机场
- 18:20 航班起飞（吉碑→岘港，544元/2人）
- 20:00 抵达岘港
- 住宿：Satya Da Nang Hotel Han-Market（603元/2晚）
- 重要：必须16:20前到机场，12:00准时出发！`
    },
    day3: {
      keywords: ['第三天', '7月13日', '巴拿山', '佛手金桥', '法国村'],
      content: `Day 3（7月13日周一）：巴拿山一日游
- 11:00 ST Coffee集合，坐3路公交前往巴拿山
- 12:00-16:30 巴拿山景区：佛手金桥→法国村→幻想乐园
- 16:30 缆车下山返回市区
- 17:30 下午茶+逛街
- 20:00 汉江河边散步看夜景
- 门票：Klook提前买更便宜，山上比市区凉5-8°C`
    },
    day4: {
      keywords: ['第四天', '7月14日', '岘港', '会安', '粉红教堂', '古城', '灯笼'],
      content: `Day 4（7月14日周二）：岘港→会安古城
- 上午：粉红教堂+占婆博物馆
- 12:00 午餐后退房，Grab前往会安（约40分钟）
- 14:30 入住Gia Huy River Side Hotel（192元/晚）
- 15:00-16:30 会安古城漫步：日本桥、福建会馆
- 16:30-17:30 迦南岛椰子林篮子船（约25元/人）
- 17:30-18:30 古城河边下午茶
- 19:00 晚餐：高楼面+白玫瑰饺子
- 20:00 会安夜景：灯笼街、放河灯（约8.5元/盏）`
    },
    day5: {
      keywords: ['第五天', '7月15日', '会安', '美溪海滩', '安邦海滩'],
      content: `Day 5（7月15日周三）：会安→美溪海滩
- 09:00-11:00 安邦海滩（会安最美海滩）
- 11:00-12:00 回古城午餐+最后逛逛
- 13:00 退房，Grab前往美溪海滩（约40分钟）
- 14:00 入住Pergola Design Hotel（847元/3晚）
- 15:00-17:30 美溪海滩踩水、拍照
- 18:30 海鲜晚餐`
    },
    day6: {
      keywords: ['第六天', '7月16日', '美溪海滩', '榴莲', 'chill', '休闲'],
      content: `Day 6（7月16日周四）：海滩休闲日
- 上午：睡到自然醒，咖啡馆
- 10:00-12:00 美溪海滩chill time
- 12:00 午餐
- 14:00-17:00 海滩/泳池/SPA
- 17:30 榴莲时间！

榴莲推荐：
1. Nguyen Van Thoai街My Kingdom附近 - 明码标价
2. 韩市场附近336 Phan Chau Trinh街 - 早上最新鲜
3. Che Lien甜品店 - 榴莲甜汤，岘港老字号
4. Con Market（和市场）- 本地市场，整颗买更划算`
    },
    day7: {
      keywords: ['第七天', '7月17日', '五行山', '龙桥', '喷火', '山茶半岛'],
      content: `Day 7（7月17日周五）：五行山+龙桥喷火
- 09:00-11:30 五行山（水山最值得爬）
- 12:00 午餐：方广面Mi Quang
- 14:00-17:00 山茶半岛灵应寺（67米观音像）
- 18:00 晚餐
- 21:00 龙桥喷火表演（周五限定！）
- 注意：龙桥喷火周五/六/日晚9点，提前15分钟占位`
    },
    day8: {
      keywords: ['第八天', '7月18日', '返程', '胡志明', '广州'],
      content: `Day 8（7月18日周六）：返程
- 07:00 岘港机场出发
- 09:10 航班起飞（岘港→胡志明，1010元/人）
- 10:40 抵达胡志明新山一T3
- 10:40-18:55 胡志明停留（约8小时）
- 18:55 航班起飞（胡志明→广州白云T1）
- 注意：转机停留8小时，可在机场内休息或附近逛逛`
    },
    hotels: {
      keywords: ['酒店', '住宿', '住哪里', '民宿'],
      content: `住宿安排（共7晚，1784元）：
1. 芒街天堂酒店（7/11，1晚）- 142元
2. Satya Da Nang Hotel Han-Market（7/12-13，2晚）- 603元
   位置：汉江河畔，市中心，步行到占婆博物馆、龙桥、韩市场
3. Gia Huy River Side Hotel（7/14，1晚）- 192元
   位置：会安古镇河畔
4. Pergola Design Hotel（7/15-17，3晚）- 847元
   位置：美溪海滩，距海滩240米，靠近龙桥`
    },
    transport: {
      keywords: ['交通', '怎么去', '包车', 'Grab', '打车', '公交'],
      content: `交通方式：
1. 国内段：高铁（广州→南宁→东兴）
2. 芒街→吉碑机场：包车（260元/2人，约3小时）
3. 岘港市内：Grab打车（避免被宰）
4. 岘港→巴拿山：3路公交
5. 岘港→会安：Grab（约40分钟）
6. 机场交通：Grab

重要：岘港打车一律用Grab，不要路边拦车`
    },
    food: {
      keywords: ['美食', '吃什么', '餐厅', '榴莲', '海鲜', '河粉'],
      content: `美食推荐：
1. 越南河粉（Pho）- 必吃
2. 高楼面（Cao Lầu）- 会安特色
3. 白玫瑰饺子 - 会安特色
4. 方广面（Mi Quang）- 岘港特色宽面
5. 海鲜 - 美溪海滩沿线餐厅
6. 榴莲 - 7月是旺季，品质好价格实惠
   推荐：Nguyen Van Thoai街、韩市场附近、Che Lien甜品店
7. 越南法包（Banh Mi）
8. 椰子水 - 海滩必备`
    },
    attractions: {
      keywords: ['景点', '玩什么', '去哪里', '佛手金桥', '龙桥', '五行山'],
      content: `主要景点：
1. 巴拿山（Ba Na Hills）- 佛手金桥、法国村、幻想乐园
2. 会安古镇 - 日本桥、福建会馆、灯笼街
3. 美溪海滩 - 全球六大最美海滩之一
4. 五行山 - 水山最值得爬
5. 龙桥 - 周五/六/日晚9点喷火表演
6. 山茶半岛灵应寺 - 67米白色观音像
7. 粉红教堂 - 岘港大教堂
8. 占婆博物馆
9. 韩市场 - 购物、买手信`
    },
    tips: {
      keywords: ['注意', '提醒', '签证', '货币', '防晒', '安全'],
      content: `重要提醒：
1. 签证：提前办理越南电子签证e-Visa，$25 USD/人，3-6个工作日出签
2. 货币：口岸ATM银联取现，1 CNY ≈ 3,400 VND
3. 防晒：7月紫外线强，SPF50+防晒霜必备
4. 饮水：只喝瓶装水，不喝自来水
5. 砍价：夜市/市场买东西要砍价，对半砍起
6. 小费：越南没有强制小费文化
7. Grab：岘港打车一律用Grab
8. 巴拿山：Klook提前买票更便宜，山上比市区凉5-8°C
9. 龙桥喷火：周五/六/日晚9点，提前15分钟占位
10. 天气：7月是旱季，晴天为主，偶有短暂阵雨`
    },
    budget: {
      keywords: ['费用', '预算', '多少钱', '花费'],
      content: `费用明细（2人合计，约8355元）：
- 交通：3824元
  * 广州→南宁→东兴 车票：~1000元
  * 芒街→吉碑 包车：260元
  * 吉碑→岘港 机票：544元
  * 岘港→胡志明→广州 机票：2020元
- 住宿：1784元（7晚）
- 门票+活动：~597元
  * 巴拿山门票：~530元
  * 篮子船：~50元
  * 河灯：~17元
- 餐饮：1500元（7天）
- 当地交通：~650元`
    }
  };
  
  const results = [];
  for (const [key, data] of Object.entries(knowledge)) {
    const matched = data.keywords.some(keyword => question.includes(keyword));
    if (matched) {
      results.push(data.content);
    }
  }
  
  return results.length > 0 ? results.join('\n\n') : '';
}

function needsWebSearch(question) {
  const searchKeywords = ['天气', '汇率', '最新', '现在', '今天', '实时', '当前'];
  return searchKeywords.some(keyword => question.includes(keyword));
}

async function searchDuckDuckGo(query) {
  try {
    const searchQuery = encodeURIComponent(`越南岘港 ${query}`);
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${searchQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    const results = [];
    const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
    const snippetRegex = /<a class="result__snippet" href="[^"]+">([^<]+)<\/a>/g;
    
    let match;
    let count = 0;
    while ((match = resultRegex.exec(html)) !== null && count < 3) {
      const snippetMatch = snippetRegex.exec(html);
      if (snippetMatch) {
        results.push(`${match[2]}: ${snippetMatch[1]}`);
      }
      count++;
    }
    
    return results.length > 0 ? results.join('\n') : '';
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return '';
  }
}

function buildSystemPrompt(knowledgeContext, webContext) {
  let prompt = `你是一个越南岘港旅行助手，帮助一对情侣解答关于他们7天6晚岘港旅行的问题。

行程概览：
- 日期：2026年7月11日-18日
- 人数：2人（情侣）
- 出发地：广州
- 目的地：越南岘港
- 总预算：约8355元人民币

`;

  if (knowledgeContext) {
    prompt += `\n相关知识库信息：\n${knowledgeContext}\n`;
  }

  if (webContext) {
    prompt += `\n网络搜索结果：\n${webContext}\n`;
  }

  prompt += `\n请基于以上信息回答用户问题。如果知识库和网络搜索都没有相关信息，请基于你的知识给出合理建议，并说明这是推断而非确定信息。

回答要求：
1. 简洁明了，直接回答问题
2. 如果有具体数据（价格、时间等），请准确引用
3. 如果是建议或推断，请明确说明
4. 用中文回答`;

  return prompt;
}

async function callAIAPI(question, systemPrompt, env) {
  const API_URL = env.AI_API_URL;
  const API_KEY = env.AI_API_KEY;
  const MODEL = env.AI_MODEL;
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}
