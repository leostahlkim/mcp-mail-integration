const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001';

let sessionId: string | null = null;

interface McpToolResult<T = unknown> {
  content: Array<{ type: string; text: string }>;
}

export async function callMcpTool<T>(
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  // Store session ID for subsequent requests
  const newSessionId = response.headers.get('mcp-session-id');
  if (newSessionId) {
    sessionId = newSessionId;
  }

  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'MCP tool error');
  }

  const result = data.result as McpToolResult<T>;
  const textContent = result.content.find(c => c.type === 'text');

  if (!textContent) {
    throw new Error('No text content in response');
  }

  return JSON.parse(textContent.text) as T;
}

// Type-safe tool wrappers
import type {
  AuthInitiateInput,
  AuthInitiateOutput,
  AuthCallbackInput,
  AuthCallbackOutput,
  AuthStatusInput,
  AuthStatusOutput,
  EmailFetchInput,
  EmailFetchOutput,
  EmailGetContentInput,
  EmailContent,
  EmailArchiveInput,
  EmailArchiveOutput,
  ClassifyEmailsInput,
  ClassifyEmailsOutput,
} from '@mcp-mail/shared';

export const mcpTools = {
  authInitiate: (input: AuthInitiateInput) =>
    callMcpTool<AuthInitiateOutput>('auth_initiate', input),

  authCallback: (input: AuthCallbackInput) =>
    callMcpTool<AuthCallbackOutput>('auth_callback', input),

  authStatus: (input: AuthStatusInput = {}) =>
    callMcpTool<AuthStatusOutput>('auth_status', input),

  emailsFetch: (input: EmailFetchInput) =>
    callMcpTool<EmailFetchOutput>('emails_fetch', input),

  emailGetContent: (input: EmailGetContentInput) =>
    callMcpTool<EmailContent>('email_get_content', input),

  emailsArchive: (input: EmailArchiveInput) =>
    callMcpTool<EmailArchiveOutput>('emails_archive', input),

  emailsClassify: (input: ClassifyEmailsInput) =>
    callMcpTool<ClassifyEmailsOutput>('emails_classify', input),
};
