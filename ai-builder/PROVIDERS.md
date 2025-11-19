# Supported AI Providers

AI Builder works with **ANY** OpenAI-compatible API endpoint. Here are quick setup guides for popular providers:

## 🏠 Local Models (FREE)

### LM Studio
1. Download from https://lmstudio.ai
2. Download a model (e.g., Llama 3 70B)
3. Start local server (default port 1234)
4. Configure:
```env
AI_PROVIDER=openai-compatible
AI_MODEL=llama-3-70b  # Match your model name
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=local
```

### Ollama
1. Install from https://ollama.ai
2. Pull a model: `ollama pull llama3:70b`
3. Run: `ollama serve`
4. Configure:
```env
AI_PROVIDER=openai-compatible
AI_MODEL=llama3:70b
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=local
```

### LocalAI
1. Install from https://localai.io
2. Start server with your model
3. Configure:
```env
AI_PROVIDER=openai-compatible
AI_MODEL=your-model-name
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_API_KEY=local
```

## ☁️ Cloud Providers

### OpenAI
```env
AI_PROVIDER=openai-compatible
AI_MODEL=gpt-4  # or gpt-3.5-turbo
OPENAI_API_KEY=sk-xxx
# OPENAI_BASE_URL not needed (uses default)
```

### Anthropic Claude
**Recommended for 90% cost savings with prompt caching!**
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Together AI
```env
AI_PROVIDER=openai-compatible
AI_MODEL=meta-llama/Llama-3-70b-chat-hf
OPENAI_BASE_URL=https://api.together.xyz/v1
OPENAI_API_KEY=your-together-key
```

### Groq (Super Fast)
```env
AI_PROVIDER=openai-compatible
AI_MODEL=llama-3.1-70b-versatile  # or mixtral-8x7b-32768
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=your-groq-key
```

### Perplexity
```env
AI_PROVIDER=openai-compatible
AI_MODEL=llama-3.1-70b-instruct
OPENAI_BASE_URL=https://api.perplexity.ai
OPENAI_API_KEY=pplx-xxx
```

### Google Gemini
```env
AI_PROVIDER=google
AI_MODEL=gemini-1.5-pro
GEMINI_API_KEY=your-google-key
```

### DeepSeek
```env
AI_PROVIDER=openai-compatible
AI_MODEL=deepseek-chat
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=your-deepseek-key
```

### Mistral AI
```env
AI_PROVIDER=openai-compatible
AI_MODEL=mistral-large-latest
OPENAI_BASE_URL=https://api.mistral.ai/v1
OPENAI_API_KEY=your-mistral-key
```

## 🔧 Custom Endpoints

Works with **any** service implementing OpenAI's API specification:

```env
AI_PROVIDER=openai-compatible
AI_MODEL=your-model-name
OPENAI_BASE_URL=https://your-custom-endpoint.com/v1
OPENAI_API_KEY=your-api-key
```

## 💡 Tips

### For Local Models:
- ✅ **FREE** - No API costs
- ✅ **Privacy** - Data stays on your machine
- ✅ **Offline** - Works without internet
- ⚠️ **Slower** - Depends on your hardware
- ⚠️ **Quality** - May not match GPT-4/Claude

**Recommended local models:**
- Llama 3 70B (best quality)
- Mixtral 8x7B (good balance)
- Qwen 2.5 72B (coding focused)

### For Cloud APIs:
- **Anthropic Claude** - Best for cost savings (90% with caching)
- **OpenAI GPT-4** - Best overall quality
- **Groq** - Fastest inference (great for testing)
- **Together AI** - Good balance of cost/quality

### Cost Comparison (per 1M tokens):

| Provider | Input | Output | With AI Builder Optimization |
|----------|-------|--------|------------------------------|
| Local Models | $0 | $0 | $0 (FREE!) |
| Groq (Llama 3) | $0.05 | $0.08 | ~$0.01 (80% savings) |
| Together AI | $0.20 | $0.20 | ~$0.04 (80% savings) |
| OpenAI GPT-4 | $3.00 | $15.00 | ~$0.60 (80% savings) |
| Anthropic Claude | $3.00 | $15.00 | ~$0.30 (90% with caching!) |

## 🚀 Quick Start Examples

### 1. Start with LM Studio (FREE)
```bash
# 1. Download LM Studio and a model
# 2. Start local server
# 3. Configure
echo 'AI_PROVIDER=openai-compatible
AI_MODEL=llama-3-70b
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=local' > .env.local

# 4. Run
npm run dev
```

### 2. Use Groq (FAST & CHEAP)
```bash
# 1. Get free API key from https://console.groq.com
# 2. Configure
echo 'AI_PROVIDER=openai-compatible
AI_MODEL=llama-3.1-70b-versatile
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=your-groq-key' > .env.local

# 3. Run
npm run dev
```

### 3. Use Claude (BEST SAVINGS)
```bash
# 1. Get API key from https://console.anthropic.com
# 2. Configure
echo 'AI_PROVIDER=anthropic
AI_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-xxx' > .env.local

# 3. Run
npm run dev
```

## ❓ Troubleshooting

### "Connection refused" with local models
- Make sure LM Studio/Ollama server is running
- Check the port number matches your config
- Try `curl http://localhost:1234/v1/models` to test

### "Invalid API key" with cloud providers
- Verify your API key is correct
- Check you have credits/quota remaining
- Ensure base URL is correct for your provider

### Model not responding
- Check model name matches exactly (case-sensitive)
- Verify model is loaded in LM Studio/Ollama
- Check server logs for errors

## 🔄 Switching Providers

You can switch providers anytime by changing `.env.local`:

```bash
# Try locally first (free)
AI_PROVIDER=openai-compatible
OPENAI_BASE_URL=http://localhost:1234/v1

# Then switch to cloud for better quality
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
```

**No code changes needed!** Just restart the dev server.
