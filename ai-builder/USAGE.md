# AI Builder - Usage Guide

## Quick Start

### 1. First Time Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local and add your API key
# (Use Anthropic for best token savings)
nano .env.local

# Start the app
npm run dev

# Open browser
open http://localhost:3000
```

### 2. Create Your First Project

1. Click **"New Project"** button
2. Enter project name (e.g., "My Landing Page")
3. Wait for preview server to start
4. You're ready to build!

## Example Workflows

### Build a Landing Page

**Step 1: Initial Generation**
```
Prompt: "Create a modern landing page with:
- Hero section with gradient background
- Features section with 3 cards
- Testimonials carousel
- Contact form
- Footer with social links"

Result: Full React app generated (~3,000 tokens)
Preview: Live preview appears
```

**Step 2: Style Tweaks**
```
Prompt: "Change hero gradient to blue and purple"

Result: Only Hero.tsx edited (~500 tokens - 83% savings!)
Preview: Updates instantly
```

**Step 3: Add Feature**
```
Prompt: "Add a pricing section with 3 tiers"

Result: Creates Pricing.tsx + updates App.tsx (~1,200 tokens)
Preview: New section appears
```

### Build a Dashboard

**Initial:**
```
Prompt: "Create a dashboard with:
- Sidebar navigation
- Header with user menu
- 4 stat cards
- Chart using chart.js
- Data table"

Result: Multi-component app with charts
Packages: Auto-installs chart.js
```

**Iterate:**
```
"Make the sidebar collapsible"
"Add dark mode toggle"
"Make the table sortable"
```

### Build a Blog

**Initial:**
```
Prompt: "Create a blog with:
- Header with search
- Post grid layout
- Sidebar with categories
- Post detail view
- Markdown support"

Result: Complete blog structure
Packages: Auto-installs markdown parser
```

## Token Optimization in Action

### Scenario 1: Simple Color Change

**Naive Approach (No Optimization):**
- Sends ALL 20 files
- Sends full conversation history
- No caching
- **Cost: 14,000 tokens ($0.021)**

**AI Builder (Optimized):**
- Detects intent: UPDATE_STYLE
- Sends ONLY target file (Hero.tsx)
- Uses cached system prompt
- Windowed conversation
- **Cost: 800 tokens ($0.002)**
- **Savings: 94%!**

### Scenario 2: Add New Feature

**Naive Approach:**
- Regenerates entire app
- **Cost: 15,000 tokens ($0.023)**

**AI Builder:**
- Creates new component
- Updates parent to import it
- Minimal context (2 files)
- **Cost: 2,500 tokens ($0.004)**
- **Savings: 83%!**

### Scenario 3: Bug Fix

**Naive Approach:**
- Sends all files "just in case"
- **Cost: 14,000 tokens**

**AI Builder:**
- Analyzes intent: FIX_ISSUE
- Sends only affected file
- Includes related imports as context
- **Cost: 1,200 tokens**
- **Savings: 91%!**

## Pro Tips

### 1. Be Specific

❌ **Vague:** "Make it look better"
✅ **Specific:** "Change header background to gradient blue, add shadow"

**Why:** Specific prompts = better intent detection = fewer files = lower cost

### 2. Iterate, Don't Rebuild

❌ **Rebuild:** "Start over with a new design"
✅ **Iterate:** "Update the hero design with X, Y, Z"

**Why:** Iterative edits use 95% fewer tokens

### 3. Use Edit-Specific Language

For maximum token savings, use keywords that trigger surgical edits:

- **UPDATE_STYLE**: "change", "update color", "make X blue"
- **UPDATE_COMPONENT**: "modify", "edit", "update"
- **ADD_FEATURE**: "add", "create", "new"
- **FIX_ISSUE**: "fix", "debug", "resolve"

### 4. Check Preview Between Changes

The preview updates automatically. Check it before next edit to ensure changes applied correctly.

### 5. Package Management

Packages are auto-detected and installed. Just use them:

```
"Add charts using recharts"
```

System automatically:
1. Detects `import { LineChart } from 'recharts'`
2. Runs `npm install recharts`
3. Restarts preview

## Advanced Usage

### Custom Configuration

Edit `config/builder.config.ts` for fine-tuning:

```typescript
export const builderConfig = {
  ai: {
    temperature: 0.7,  // Lower = more focused
    maxTokens: 8192,   // Higher = more complete
  },
  optimization: {
    maxContextFiles: 3,  // Fewer = faster
    contextFileTruncateAt: 1000,  // Lower = cheaper
  },
};
```

### Multiple Projects

The system manages multiple projects simultaneously:

```
projects/
├── landing-page-1234/
├── dashboard-5678/
└── blog-9012/
```

Each has its own Vite server on different ports.

### Export & Deploy

Projects are standard Vite apps:

```bash
cd projects/my-project-1234

# Build for production
npm run build

# Deploy anywhere
# Vercel, Netlify, etc.
```

## Monitoring Token Usage

### In Console

```
[Chat] Estimated tokens: 820
[FileCache] HIT for project abc (15 files)
[ContextSelector] Primary: 1, Context: 0
[Conversation] Total: 5000, Cached: 4000, Saved: 80%
```

### Track Savings

After each session:
```
[Conversation] Session stats:
- Requests: 10
- Tokens saved: 85%
- Cost: $0.02 (vs $0.20 without optimization)
```

## Common Issues

### "Preview not loading"

**Solution:**
```bash
# Check Vite process
ps aux | grep vite

# Restart preview
# Re-select project in dropdown
```

### "Package not found"

**Solution:**
```bash
# Manually install
cd projects/{project-id}
npm install {package-name}

# Or ask AI to fix
Prompt: "install missing package X"
```

### "Out of tokens"

Check your API key has credits:
- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com

## Cost Calculator

Based on Claude Sonnet pricing:

| Requests | Without Opt. | With AI Builder | You Save |
|----------|-------------|-----------------|----------|
| 10 | $0.21 | $0.02 | $0.19 |
| 100 | $2.10 | $0.20 | $1.90 |
| 1,000 | $21.00 | $2.00 | $19.00 |
| 10,000 | $210.00 | $20.00 | $190.00 |

**Average savings: 85-90%**

## Best Practices

### 1. Start Broad, Then Narrow

```
1. "Create a portfolio website" (Full generation)
2. "Update hero colors" (Surgical edit)
3. "Add contact form" (Feature addition)
```

### 2. Use Preview Feedback

```
1. Ask for change
2. Wait for preview
3. If good: continue
4. If not: ask for refinement
```

### 3. Leverage Conversation Memory

The system remembers:
- Recent edits
- File structure
- Your preferences

Use this:
```
"Make that same change to the footer"
"Use the same gradient as before"
```

### 4. Name Things Clearly

```
❌ "Create component 1"
✅ "Create HeroSection component"
```

Better names = better intent detection = cheaper edits

## Support

Issues? Questions?

1. Check logs in console
2. Review this guide
3. Check config settings
4. Try restarting dev server

**Remember: 85-95% token savings is normal. If you're seeing higher costs, check your configuration!**

---

Happy building! 🚀
