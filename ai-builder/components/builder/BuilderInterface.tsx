/**
 * Main Builder Interface
 * Split-view chat + preview interface
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { Project } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function BuilderInterface() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load projects from API
  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  // Create new project
  const createProject = async () => {
    const name = prompt('Project name:');
    if (!name) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (data.success) {
        const project = data.data;
        setProjects([...projects, project]);
        setCurrentProject(project);

        // Start preview server
        startPreview(project.id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Start preview server
  const startPreview = async (projectId: string) => {
    try {
      setStatus('Starting preview...');

      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action: 'start' }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setPreviewUrl(data.data.url);
        setStatus('Preview ready');
      }
    } catch (error) {
      console.error('Failed to start preview:', error);
      setStatus('Preview failed');
    }
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || !currentProject || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          projectId: currentProject.id,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'status') {
              setStatus(data.message);
            } else if (data.type === 'stream') {
              assistantMessage += data.text;
              // Update last message
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === 'assistant') {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: assistantMessage },
                  ];
                } else {
                  return [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: assistantMessage,
                    },
                  ];
                }
              });
            } else if (data.type === 'complete') {
              setStatus('✅ ' + data.message);

              // Refresh preview
              if (previewUrl) {
                setPreviewUrl(previewUrl + '?t=' + Date.now());
              }
            } else if (data.type === 'error') {
              setStatus('❌ Error: ' + data.error);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setStatus('❌ Request failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">AI Builder</h1>

          <div className="flex items-center gap-4">
            {/* Project selector */}
            <select
              value={currentProject?.id || ''}
              onChange={(e) => {
                const project = projects.find((p) => p.id === e.target.value);
                if (project) {
                  setCurrentProject(project);
                  startPreview(project.id);
                }
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={createProject}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              New Project
            </button>
          </div>
        </div>

        {status && (
          <div className="mt-2 text-sm text-gray-600">{status}</div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat panel */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg font-medium mb-2">Start building with AI</p>
                <p className="text-sm">
                  Select a project or create a new one, then describe what you want to build.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {msg.content}
                    </pre>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={
                  currentProject
                    ? 'Describe what you want to build...'
                    : 'Select a project first'
                }
                disabled={!currentProject || isGenerating}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={sendMessage}
                disabled={!currentProject || isGenerating || !input.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="w-1/2 bg-gray-900 flex flex-col">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-300 font-mono">
              {previewUrl || 'No preview'}
            </span>
            {previewUrl && (
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Open in new tab →
              </button>
            )}
          </div>

          <div className="flex-1 bg-white">
            {previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-medium">No preview available</p>
                  <p className="text-sm mt-1">Create a project to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
