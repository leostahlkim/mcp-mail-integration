import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { authTools } from './tools/auth.tools.js';
import { emailTools } from './tools/email.tools.js';
import { classifyTools } from './tools/classify.tools.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-mail-server',
    version: '1.0.0',
  });

  // Register auth tools
  server.tool(
    'auth_initiate',
    authTools.auth_initiate.description,
    {
      provider: z.enum(['gmail', 'yahoo']).describe('Email provider to authenticate with'),
    },
    async (args) => {
      const result = await authTools.auth_initiate.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  server.tool(
    'auth_callback',
    authTools.auth_callback.description,
    {
      provider: z.enum(['gmail', 'yahoo']).describe('Email provider'),
      code: z.string().describe('OAuth authorization code'),
      state: z.string().describe('OAuth state parameter'),
    },
    async (args) => {
      const result = await authTools.auth_callback.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  server.tool(
    'auth_status',
    authTools.auth_status.description,
    {
      provider: z.enum(['gmail', 'yahoo']).optional().describe('Filter by provider'),
    },
    async (args) => {
      const result = await authTools.auth_status.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  // Register email tools
  server.tool(
    'emails_fetch',
    emailTools.emails_fetch.description,
    {
      provider: z.enum(['gmail', 'yahoo']).describe('Email provider'),
      accountEmail: z.string().email().describe('Account email address'),
      maxResults: z.number().min(1).max(100).default(50).describe('Max emails to fetch'),
      pageToken: z.string().optional().describe('Pagination token'),
      query: z.string().optional().describe('Search query'),
      labelIds: z.array(z.string()).optional().describe('Filter by label IDs'),
    },
    async (args) => {
      const result = await emailTools.emails_fetch.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  server.tool(
    'email_get_content',
    emailTools.email_get_content.description,
    {
      provider: z.enum(['gmail', 'yahoo']).describe('Email provider'),
      accountEmail: z.string().email().describe('Account email address'),
      emailId: z.string().describe('Email ID'),
    },
    async (args) => {
      const result = await emailTools.email_get_content.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  server.tool(
    'emails_archive',
    emailTools.emails_archive.description,
    {
      provider: z.enum(['gmail', 'yahoo']).describe('Email provider'),
      accountEmail: z.string().email().describe('Account email address'),
      emailIds: z.array(z.string()).min(1).max(100).describe('Email IDs to archive'),
    },
    async (args) => {
      const result = await emailTools.emails_archive.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  // Register classify tools
  server.tool(
    'emails_classify',
    classifyTools.emails_classify.description,
    {
      provider: z.enum(['gmail', 'yahoo']).describe('Email provider'),
      accountEmail: z.string().email().describe('Account email address'),
      emailIds: z.array(z.string()).min(1).max(20).describe('Email IDs to classify'),
    },
    async (args) => {
      const result = await classifyTools.emails_classify.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  return server;
}
