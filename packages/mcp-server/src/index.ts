import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import crypto from 'node:crypto';
import { createMcpServer } from './server.js';
import { getNgrokUrl } from './utils/tunnel.js';

const PORT = parseInt(process.env.MCP_SERVER_PORT || '3001', 10);

async function main() {
  const app = express();

  // Detect ngrok tunnel on startup
  const ngrokUrl = await getNgrokUrl();
  if (ngrokUrl) {
    console.log(`ngrok tunnel detected: ${ngrokUrl}`);
    console.log('OAuth redirects will use ngrok URL');
  } else {
    console.log('No ngrok tunnel detected, using localhost for OAuth redirects');
  }

  // Build allowed origins list
  const allowedOrigins = ['http://localhost:3000'];
  if (ngrokUrl) {
    allowedOrigins.push(ngrokUrl);
  }

  // CORS for web app - must come before routes
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
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

    // Handle the request (pass req.body since express.json() already parsed it)
    await transport.handleRequest(req, res, req.body);
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
