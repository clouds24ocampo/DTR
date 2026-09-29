const { execSync } = require('child_process');

const ports = [9001, 9000, 5000, 5173];

for (const port of ports) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && Number(pid) !== process.pid) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[Auto-Clean] Released port ${port} (PID ${pid})`);
          } catch (e) {}
        }
      }
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch (e) {
    // Port was already free, nothing to do
  }
}
