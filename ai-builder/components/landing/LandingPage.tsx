/**
 * Landing Page Component
 * Showcases features and provides entry point to the builder
 */

'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      title: 'Massive Token Savings',
      description: '85-95% reduction in token usage with intelligent caching, context selection, and conversation windowing',
      icon: '⚡',
    },
    {
      title: 'Multi-Provider Support',
      description: 'Works with ANY OpenAI-compatible API: LM Studio, Ollama, Together AI, Groq, Anthropic, and more',
      icon: '🔌',
    },
    {
      title: 'Local Development',
      description: 'Run completely free with local models. No API costs for development and testing',
      icon: '💻',
    },
    {
      title: 'Smart Context Selection',
      description: 'Analyzes your prompts and only sends relevant files to the AI, reducing costs and improving speed',
      icon: '🎯',
    },
    {
      title: 'Live Preview',
      description: 'See your React app come to life in real-time with hot-reloading Vite dev server',
      icon: '👁️',
    },
    {
      title: 'Production Ready',
      description: 'Built with TypeScript, Next.js 15, and React 19. Fully typed and production-ready',
      icon: '🚀',
    },
  ];

  const examplePrompts = [
    'Create a todo list app with dark mode toggle',
    'Build a weather dashboard using a weather API',
    'Make a portfolio website with smooth animations',
    'Create a calculator with scientific functions',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-4">
            <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-4 py-1.5 rounded-full">
              Production Ready • Token Optimized
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Build React Apps with AI
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-2">
              Save 85-95% on Tokens
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Production-ready AI web app builder with maximum token optimization.
            <br />
            Works with any OpenAI-compatible API or run completely free with local models.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => router.push('/builder')}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started →
            </button>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors border-2 border-gray-200"
            >
              View Docs
            </a>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto py-8 border-t border-b border-gray-200">
            <div>
              <div className="text-3xl font-bold text-blue-600">85-95%</div>
              <div className="text-sm text-gray-600 mt-1">Token Savings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">10+</div>
              <div className="text-sm text-gray-600 mt-1">AI Providers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">100%</div>
              <div className="text-sm text-gray-600 mt-1">Free Option</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-gray-600">
            Built from the ground up with token optimization and developer experience in mind
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
            How It Works
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Create a Project
                </h3>
                <p className="text-gray-600">
                  Click "New Project" and give it a name. We'll set up a fresh React + Vite project for you.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Describe What You Want
                </h3>
                <p className="text-gray-600">
                  Type a prompt describing your app. Our AI analyzes your intent and generates the perfect code.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Watch It Build
                </h3>
                <p className="text-gray-600">
                  See your app come to life in the live preview. Make changes with follow-up prompts at 90% lower cost.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Try these example prompts:</h4>
            <ul className="space-y-2">
              {examplePrompts.map((prompt, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>{prompt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Token Optimization Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Token Optimization Technology
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            We use 5 advanced strategies to minimize token usage without sacrificing quality
          </p>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">📦 File Caching</h3>
              <p className="text-gray-700 text-sm">
                Caches project files in memory with TTL to avoid re-reading from disk
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">🎯 Smart Context Selection</h3>
              <p className="text-gray-700 text-sm">
                Analyzes your prompt and only sends relevant files (80-95% reduction)
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">💬 Conversation Windowing</h3>
              <p className="text-gray-700 text-sm">
                Keeps only last 5 messages in context, caps at 2000 chars (70% savings)
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">⚡ Prompt Caching</h3>
              <p className="text-gray-700 text-sm">
                Separates cacheable content (system prompts) from dynamic content (90% savings with Anthropic)
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-2">🗺️ Manifest Parsing</h3>
              <p className="text-gray-700 text-sm">
                Understands component relationships to intelligently select dependencies
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 mb-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Start creating React apps with AI in seconds. No credit card required.
          </p>
          <button
            onClick={() => router.push('/builder')}
            className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
          >
            Launch Builder →
          </button>
          <p className="text-sm text-blue-100 mt-4">
            Free forever with local models • Scale up with cloud APIs when you need it
          </p>
        </div>
      </div>
    </div>
  );
}
