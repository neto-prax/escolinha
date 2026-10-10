#!/usr/bin/env node

import { spawnSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const composeFile = path.join(rootDir, 'docker-compose.wa-akg.yml');

/**
 * Checks if a port is responding to HTTP requests.
 */
function isPortActive(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/' }, () => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWakg() {
  // 1. If already active, continue immediately
  const alreadyRunning = await isPortActive(3000);
  if (alreadyRunning) {
    console.log('\x1b[32m[WAKG] ✅ Servidor WAKG já está ativo em http://localhost:3000\x1b[0m');
    return;
  }

  console.log('\x1b[36m[WAKG] 🚀 Iniciando contêineres do WAKG (docker-compose.wa-akg.yml)...\x1b[0m');

  // 2. Try running docker compose
  let res = spawnSync('docker', ['compose', '-f', composeFile, 'up', '-d'], {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (res.status !== 0) {
    const errText = (res.stderr || res.stdout || '').toLowerCase();
    const isPermissionError =
      errText.includes('permission denied') ||
      errText.includes('docker.sock') ||
      errText.includes('connect to the docker api');

    if (isPermissionError) {
      console.log('\x1b[33m[WAKG] 🔑 Permissão de acesso ao Docker necessária. Tentando via sudo...\x1b[0m');
      const sudoRes = spawnSync('sudo', ['docker', 'compose', '-f', composeFile, 'up', '-d'], {
        cwd: rootDir,
        stdio: 'inherit',
      });

      if (sudoRes.status !== 0) {
        console.warn('\x1b[31m[WAKG] ⚠️ Não foi possível iniciar o Docker via sudo.\x1b[0m');
        console.warn(
          '\x1b[33m[WAKG] 💡 Dica: Para rodar sem senha, adicione seu usuário ao grupo docker:\x1b[0m\n' +
          '        sudo usermod -aG docker $USER && newgrp docker\n'
        );
        return;
      }
    } else {
      console.warn('\x1b[31m[WAKG] ⚠️ Erro ao executar docker compose:\x1b[0m', res.stderr || res.stdout);
      return;
    }
  } else {
    if (res.stdout && res.stdout.trim()) {
      console.log(res.stdout.trim());
    }
  }

  // 3. Wait up to 15s for the gateway to respond on port 3000
  console.log('\x1b[36m[WAKG] ⏳ Aguardando gateway inicializar na porta 3000...\x1b[0m');
  const maxAttempts = 15;
  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(1000);
    const active = await isPortActive(3000);
    if (active) {
      console.log('\x1b[32m[WAKG] ✅ Servidor WAKG conectado com sucesso em http://localhost:3000!\x1b[0m');
      return;
    }
  }

  console.log(
    '\x1b[33m[WAKG] ℹ️ Contêineres iniciados em segundo plano. O WAKG estará disponível em instantes em http://localhost:3000\x1b[0m'
  );
}

startWakg().catch((err) => {
  console.warn('[WAKG] Falha ao verificar/iniciar servidor WAKG:', err?.message || err);
});

