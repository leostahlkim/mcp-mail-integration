import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import crypto from 'node:crypto';
import { createMcpServer } from './server.js';

const PORT = parseInt(process.env.MCP_SERVER_PORT || '3001', 10);

async function main() {
  const app = express();

  // CORS for web app - must come before routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.header('Access-Control-Expose-Headers', 'mcp-session-id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json());

  // Create MCP server
  const mcpServer = createMcpServer();

  // Store active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // MCP endpoint
  app.all('/mcp', async (req, res) => {
    // Get or create session ID
    let sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    let transport = transports.get(sessionId);

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId!,
        onsessioninitialized: (id) => {
          console.log(`Session initialized: ${id}`);
        },
      });

      transports.set(sessionId, transport);
      await mcpServer.connect(transport);
    }

    // Set session ID header
    res.setHeader('mcp-session-id', sessionId);

    // Handle the request
    await transport.handleRequest(req, res);
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`MCP Mail Server running on http://localhost:${PORT}`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  });
}

main().catch(console.error);
