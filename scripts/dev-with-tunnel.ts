import { spawn, ChildProcess } from 'node:child_process';

const NGROK_API_URL = 'http://localhost:4040/api/tunnels';
const NGROK_CHECK_INTERVAL = 1000;
const NGROK_MAX_WAIT = 15000;

interface NgrokTunnel {
  public_url: string;
  proto: string;
}

interface NgrokApiResponse {
  tunnels: NgrokTunnel[];
}

async function checkNgrokRunning(): Promise<string | null> {
  try {
    const response = await fetch(NGROK_API_URL, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as NgrokApiResponse;
    const httpsTunnel = data.tunnels.find((t) => t.proto === 'https');

    return httpsTunnel?.public_url || null;
  } catch {
    return null;
  }
}

async function waitForNgrok(timeoutMs: number): Promise<string | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const url = await checkNgrokRunning();
    if (url) {
      return url;
    }
    await new Promise((resolve) => setTimeout(resolve, NGROK_CHECK_INTERVAL));
  }

  return null;
}

function startNgrok(): ChildProcess {
  console.log('Starting ngrok tunnel on port 3000...');

  const ngrok = spawn('ngrok', ['http', '3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  ngrok.stdout?.on('data', (data) => {
    const output = data.toString();
    // Only log ngrok output if it contains useful info
    if (output.includes('Forwarding') || output.includes('error')) {
      console.log(`[ngrok] ${output.trim()}`);
    }
  });

  ngrok.stderr?.on('data', (data) => {
    console.error(`[ngrok error] ${data.toString().trim()}`);
  });

  ngrok.on('error', (err) => {
    console.error('Failed to start ngrok:', err.message);
    console.error('Make sure ngrok is installed: https://ngrok.com/download');
    process.exit(1);
  });

  return ngrok;
}

function startTurboDev(): ChildProcess {
  console.log('Starting development server...\n');

  const turbo = spawn('pnpm', ['turbo', 'run', 'dev'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  turbo.on('error', (err) => {
    console.error('Failed to start turbo dev:', err.message);
    process.exit(1);
  });

  return turbo;
}

async function main() {
  console.log('Checking for ngrok tunnel...\n');

  let ngrokProcess: ChildProcess | null = null;
  let ngrokUrl = await checkNgrokRunning();

  if (ngrokUrl) {
    console.log(`ngrok already running: ${ngrokUrl}\n`);
  } else {
    ngrokProcess = startNgrok();

    console.log('Waiting for ngrok to start...');
    ngrokUrl = await waitForNgrok(NGROK_MAX_WAIT);

    if (!ngrokUrl) {
      console.error('\nFailed to start ngrok tunnel within timeout.');
      console.error('You can start ngrok manually: pnpm tunnel:start');
      ngrokProcess?.kill();
      process.exit(1);
    }

    console.log(`ngrok tunnel established: ${ngrokUrl}\n`);
  }

  const turboProcess = startTurboDev();

  // Cleanup on exit
  const cleanup = () => {
    console.log('\nShutting down...');
    turboProcess.kill();
    if (ngrokProcess) {
      ngrokProcess.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  turboProcess.on('exit', (code) => {
    if (ngrokProcess) {
      ngrokProcess.kill();
    }
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
