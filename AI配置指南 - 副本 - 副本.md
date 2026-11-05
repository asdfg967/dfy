# AI 识别功能配置指南

## 问题说明

AI 识别通知功能需要调用大模型 API。部署到 Netlify 后，需要配置你自己的 API 密钥。

## 支持的模型提供商

本应用支持所有兼容 OpenAI 接口的大模型服务：

### 推荐方案（国内可用）

#### 1. 豆包（Doubao）- 字节跳动
- **API 地址**：`https://ark.cn-beijing.volces.com/api/v3`
- **推荐模型**：`doubao-pro-32k` 或 `doubao-lite-32k`
- **获取密钥**：https://console.volcengine.com/ark
- **优点**：国内访问快，价格实惠，中文效果好

#### 2. DeepSeek
- **API 地址**：`https://api.deepseek.com/v1`
- **推荐模型**：`deepseek-chat`
- **获取密钥**：https://platform.deepseek.com/
- **优点**：价格便宜，效果好

#### 3. 通义千问（Qwen）- 阿里云
- **API 地址**：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- **推荐模型**：`qwen-turbo` 或 `qwen-plus`
- **获取密钥**：https://dashscope.console.aliyun.com/
- **优点**：阿里云生态，稳定可靠

### 国际方案

#### 4. OpenAI
- **API 地址**：`https://api.openai.com/v1`（默认）
- **推荐模型**：`gpt-4o-mini` 或 `gpt-4o`
- **获取密钥**：https://platform.openai.com/api-keys
- **注意**：需要科学上网

## 配置步骤（Netlify）

### 步骤 1：获取 API Key

1. 选择上面的任一提供商
2. 注册账号并完成实名认证
3. 创建 API Key（通常叫 "API Key" 或 "Access Token"）
4. 复制 API Key（只显示一次，务必保存好）

### 步骤 2：在 Netlify 配置环境变量

1. 登录 Netlify：https://app.netlify.com
2. 选择你的项目
3. 点击顶部菜单 **Site configuration**
4. 左侧菜单点击 **Environment variables**
5. 点击 **Add variable**，添加以下 3 个变量：

#### 变量 1：LLM_API_KEY（必填）
- **Key**: `LLM_API_KEY`
- **Value**: 你的 API Key（从提供商获取）
- **Scopes**: 勾选 `All scopes` 或至少 `Functions`

#### 变量 2：LLM_API_BASE_URL（必填）
- **Key**: `LLM_API_BASE_URL`
- **Value**: API 地址（根据你选择的提供商填写）
  - 豆包：`https://ark.cn-beijing.volces.com/api/v3`
  - DeepSeek：`https://api.deepseek.com/v1`
  - 通义千问：`https://dashscope.aliyuncs.com/compatible-mode/v1`
  - OpenAI：`https://api.openai.com/v1`（或不填，默认就是这个）

#### 变量 3：LLM_MODEL（必填）
- **Key**: `LLM_MODEL`
- **Value**: 模型名称（根据你选择的提供商填写）
  - 豆包：`doubao-pro-32k`
  - DeepSeek：`deepseek-chat`
  - 通义千问：`qwen-turbo`
  - OpenAI：`gpt-4o-mini`

### 步骤 3：重新部署

1. 配置完环境变量后，需要重新部署才能生效
2. 点击顶部菜单 **Deploys**
3. 点击 **Trigger deploy** → **Deploy site**
4. 等待部署完成（通常 1-2 分钟）

### 步骤 4：测试

1. 打开你的网站
2. 进入「录入通知」页面
3. 粘贴一段通知文字，例如：
   ```
   同学们注意：本周五下午3点在报告厅开家长会，请通知家长准时参加。另外，下周一之前完成英语作文一篇。
   ```
4. 点击「AI 识别」
5. 如果成功，会显示提取的事项列表

## 常见问题

### Q: 提示 "AI 服务未配置"
**A**: 环境变量没有生效。请检查：
1. 是否在 Netlify 正确配置了 3 个环境变量
2. 配置后是否重新部署了
3. 环境变量的 Key 是否拼写正确（区分大小写）

### Q: 提示 "AI 服务调用失败: 401"
**A**: API Key 错误或已过期。请检查：
1. API Key 是否正确复制（没有多余空格）
2. API Key 是否还在有效期内
3. 账户是否有余额

### Q: 提示 "AI 服务调用失败: 404"
**A**: API 地址或模型名称错误。请检查：
1. `LLM_API_BASE_URL` 是否正确
2. `LLM_MODEL` 是否是提供商支持的模型名称
3. 参考提供商的官方文档

### Q: 识别速度慢或失败
**A**: 可能是网络问题。建议：
1. 使用国内提供商（豆包、DeepSeek、通义千问）
2. 检查 Netlify 日志查看具体错误

## 费用说明

- **豆包**：约 0.0008 元/千 tokens（非常便宜）
- **DeepSeek**：约 0.001 元/千 tokens
- **通义千问**：约 0.002 元/千 tokens
- **OpenAI**：约 $0.00015/千 tokens（gpt-4o-mini）

每次识别通知大约消耗 500-2000 tokens，成本极低（几分钱）。

## 安全提示

- API Key 是敏感信息，不要分享给他人
- 不要在代码中硬编码 API Key
- 定期检查账户余额，避免欠费
- 建议设置用量限制，防止意外高额消费

## 技术支持

如果遇到问题，请检查：
1. Netlify 日志：Site configuration → Logs → Function logs
2. 查看具体的错误信息
3. 参考提供商的官方文档

---

**推荐配置示例（豆包）**：
```
LLM_API_KEY=你的豆包API Key
LLM_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL=doubao-pro-32k
```

**推荐配置示例（DeepSeek）**：
```
LLM_API_KEY=你的DeepSeek API Key
LLM_API_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```
