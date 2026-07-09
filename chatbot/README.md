# 旅行Chatbot部署指南

## 架构说明
- **前端**：HTML页面中的chatbot界面（已集成）
- **后端**：Cloudflare Worker（处理API请求+DuckDuckGo搜索）
- **AI服务**：你的中转站API

## 部署步骤

### 1. 安装Wrangler CLI
```bash
npm install -g wrangler
```

### 2. 登录Cloudflare
```bash
wrangler login
```

### 3. 配置环境变量
在Cloudflare Dashboard中设置以下Secrets：
- `AI_API_URL`：你的API中转站URL
- `AI_API_KEY`：你的API Key
- `AI_MODEL`：你的模型名称

或者使用命令行：
```bash
cd chatbot
wrangler secret put AI_API_URL
wrangler secret put AI_API_KEY
wrangler secret put AI_MODEL
```

### 4. 部署Worker
```bash
cd chatbot
wrangler deploy
```

部署成功后会显示Worker URL，类似：
```
https://travel-chatbot.your-subdomain.workers.dev
```

### 5. 更新HTML中的API地址
打开`index.html`，找到这行：
```javascript
const CHATBOT_API = 'https://travel-chatbot.your-worker.workers.dev';
```

替换为你的实际Worker URL。

### 6. 提交并推送
```bash
cd ..
git add .
git commit -m "Add chatbot"
git push
```

## 功能说明

### 知识库搜索
Chatbot内置了完整的行程知识库，包括：
- 8天详细行程
- 酒店信息
- 交通方式
- 美食推荐
- 景点介绍
- 注意事项
- 费用明细

### DuckDuckGo搜索
当用户询问实时信息（天气、汇率等）时，会自动触发网络搜索。

### AI推断
如果知识库和搜索都没有相关信息，AI会基于自己的知识给出建议，并说明这是推断。

## 测试

部署完成后，打开网页，点击右下角的💬按钮即可开始对话。

示例问题：
- "第一天去哪里？"
- "岘港有什么美食？"
- "需要带多少钱？"
- "今天岘港天气怎么样？"
- "龙桥什么时候喷火？"

## 注意事项

1. **API Key安全**：使用Cloudflare Worker的Secrets功能，API Key不会暴露在前端
2. **CORS**：Worker已配置允许跨域请求
3. **免费额度**：Cloudflare Workers免费额度为每天10万次请求，足够个人使用
4. **响应时间**：首次请求可能需要1-2秒，后续请求会更快
