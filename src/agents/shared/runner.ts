import Anthropic from '@anthropic-ai/sdk';
import type { AgentConfig, AgentOutput } from '@/shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AgentRunOptions {
  config: AgentConfig;
  userPrompt?: string;
  maxTokens?: number;
  webSearchEnabled?: boolean;
}

export interface AgentRunResult {
  content: string;
  citations: string[];
  tokensUsed: number;
}

/**
 * Run an AI research agent with the given config and optional user prompt.
 * Returns structured output with content and citations.
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const { config, userPrompt, maxTokens = 4096 } = options;

  const messages: Anthropic.MessageParam[] = [];

  if (userPrompt) {
    messages.push({ role: 'user', content: userPrompt });
  } else {
    messages.push({
      role: 'user',
      content: `Execute your research task as described in your system prompt. Provide a comprehensive update with specific data points, citations, and actionable insights. Format your response with clear sections and bullet points.`,
    });
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: config.systemPrompt,
    messages,
  });

  const content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n');

  // Extract citations (URLs) from the response
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const citations = [...new Set(content.match(urlRegex) || [])];

  return {
    content,
    citations,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

/**
 * Convert agent run result to a storable AgentOutput format.
 */
export function toAgentOutput(
  agentId: string,
  result: AgentRunResult,
  metadata?: Record<string, unknown>,
): Omit<AgentOutput, 'id'> {
  return {
    agentId,
    timestamp: new Date(),
    content: result.content,
    citations: result.citations,
    metadata: {
      ...metadata,
      tokensUsed: result.tokensUsed,
    },
  };
}
