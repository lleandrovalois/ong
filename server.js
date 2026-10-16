const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BASE_DIR = __dirname;
const ADMIN_TOKEN = 'patas@2026';
const ADMIN_CREDENTIALS = {
    email: 'admin@ongamoranimal.org',
    password: 'admin123'
};

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function safeBackupFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, filePath + '.bak');
        }
    } catch (e) {
        console.error('[CMS Backup] Erro ao criar backup:', filePath, e.message);
    }
}

function requireAdminAuth(req, res) {
    const token = req.headers['x-admin-token'] || (req.headers['authorization'] || '').replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
        console.warn(`[CMS Security] Acesso negado a ${req.method} ${req.url}: Token administrativo inválido ou ausente`);
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'Acesso negado: Autenticação administrativa necessária.' }));
        return false;
    }
    return true;
}

function getSystemVersion() {
    try {
        const cStats = fs.existsSync(path.join(BASE_DIR, 'content.json')) ? fs.statSync(path.join(BASE_DIR, 'content.json')).mtimeMs : 0;
        const aStats = fs.existsSync(path.join(BASE_DIR, 'animals.json')) ? fs.statSync(path.join(BASE_DIR, 'animals.json')).mtimeMs : 0;
        const tStats = fs.existsSync(path.join(BASE_DIR, 'theme.json')) ? fs.statSync(path.join(BASE_DIR, 'theme.json')).mtimeMs : 0;
        return Math.max(cStats, aStats, tStats);
    } catch (e) {
        return Date.now();
    }
}

const server = http.createServer((req, res) => {
    // Cabeçalhos CORS e Segurança
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let reqUrl = decodeURI(req.url.split('?')[0]);

    // API Health Check
    if (req.method === 'GET' && reqUrl === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', serverTime: new Date().toISOString() }));
        return;
    }

    // API Versão / Liveness Polling para sincronização em tempo real entre todos os dispositivos
    if (req.method === 'GET' && reqUrl === '/api/version') {
        const version = getSystemVersion();
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify({ version, timestamp: new Date().toISOString() }));
        return;
    }

    // API Login do Administrador
    if (req.method === 'POST' && reqUrl === '/api/login') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const creds = JSON.parse(body || '{}');
                const emailMatch = creds.email && creds.email.toLowerCase().trim() === ADMIN_CREDENTIALS.email.toLowerCase();
                const passMatch = creds.password && creds.password.trim() === ADMIN_CREDENTIALS.password;

                if (emailMatch && passMatch) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        token: ADMIN_TOKEN,
                        user: {
                            email: ADMIN_CREDENTIALS.email,
                            role: 'admin',
                            name: 'Administrador ONG'
                        }
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'E-mail ou senha inválidos. Utilize as credenciais de demonstração.'
                    }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Payload de login inválido' }));
            }
        });
        return;
    }

    // API Obter Tema
    if (req.method === 'GET' && reqUrl === '/api/theme') {
        const themePath = path.join(BASE_DIR, 'theme.json');
        if (fs.existsSync(themePath)) {
            const data = fs.readFileSync(themePath, 'utf-8');
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(data);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'theme.json não encontrado' }));
        }
        return;
    }

    // API Salvar Tema de Cores do CMS
    if (req.method === 'POST' && reqUrl === '/api/save-theme') {
        if (!requireAdminAuth(req, res)) return;
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 500000) {
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Payload muito grande' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const themeData = JSON.parse(body);
                if (!themeData || typeof themeData !== 'object' || !themeData.primary) {
                    throw new Error('Objeto de tema inválido (requer primary)');
                }
                themeData.updatedAt = new Date().toISOString();
                const themeFilePath = path.join(BASE_DIR, 'theme.json');
                safeBackupFile(themeFilePath);
                fs.writeFileSync(themeFilePath, JSON.stringify(themeData, null, 2), 'utf-8');
                console.log(`[CMS] Tema salvo com sucesso:`, themeData.preset || 'personalizado', themeData.primary);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, theme: themeData }));
            } catch (err) {
                console.error('[CMS] Erro ao salvar tema:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // API Obter Animais
    if (req.method === 'GET' && reqUrl === '/api/animals') {
        const animalsPath = path.join(BASE_DIR, 'animals.json');
        if (fs.existsSync(animalsPath)) {
            const data = fs.readFileSync(animalsPath, 'utf-8');
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(data);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'animals.json não encontrado' }));
        }
        return;
    }

    // API Salvar Lista de Animais
    if (req.method === 'POST' && reqUrl === '/api/save-animals') {
        if (!requireAdminAuth(req, res)) return;
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 3000000) {
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Payload muito grande' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const animalsData = JSON.parse(body);
                if (!Array.isArray(animalsData)) {
                    throw new Error('Dados de animais inválidos (deve ser um array)');
                }
                const animalsFilePath = path.join(BASE_DIR, 'animals.json');
                safeBackupFile(animalsFilePath);
                fs.writeFileSync(animalsFilePath, JSON.stringify(animalsData, null, 2), 'utf-8');
                console.log(`[CMS] Animais salvos com sucesso (${animalsData.length} registros)`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, count: animalsData.length }));
            } catch (err) {
                console.error('[CMS] Erro ao salvar animais:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // API Obter Conteúdo Geral
    if (req.method === 'GET' && reqUrl === '/api/content') {
        const contentPath = path.join(BASE_DIR, 'content.json');
        if (fs.existsSync(contentPath)) {
            const data = fs.readFileSync(contentPath, 'utf-8');
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(data);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'content.json não encontrado' }));
        }
        return;
    }

    // API Salvar Conteúdo Geral do Site (Hero, Metas, Textos, PIX, etc.)
    if (req.method === 'POST' && reqUrl === '/api/save-content') {
        if (!requireAdminAuth(req, res)) return;
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 5000000) {
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Payload muito grande' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const contentData = JSON.parse(body);
                if (!contentData || typeof contentData !== 'object') {
                    throw new Error('Dados de conteúdo inválidos (deve ser um objeto)');
                }
                contentData.updatedAt = new Date().toISOString();
                const contentFilePath = path.join(BASE_DIR, 'content.json');
                safeBackupFile(contentFilePath);
                fs.writeFileSync(contentFilePath, JSON.stringify(contentData, null, 2), 'utf-8');
                console.log(`[CMS] Conteúdo geral do site salvo com sucesso em content.json`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, updatedAt: contentData.updatedAt }));
            } catch (err) {
                console.error('[CMS] Erro ao salvar conteúdo do site:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // API Mensagens: Listar Mensagens Recebidas (Admin)
    if (req.method === 'GET' && reqUrl === '/api/messages') {
        if (!requireAdminAuth(req, res)) return;
        const msgPath = path.join(BASE_DIR, 'messages.json');
        const msgs = fs.existsSync(msgPath) ? JSON.parse(fs.readFileSync(msgPath, 'utf-8') || '[]') : [];
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify(msgs));
        return;
    }

    // API Formulário de Contato / Voluntariado / Adoção (Público)
    if (req.method === 'POST' && reqUrl === '/api/contact') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const newMsg = JSON.parse(body || '{}');
                if (!newMsg.name || !newMsg.phone) {
                    throw new Error('Nome e telefone são obrigatórios.');
                }
                newMsg.id = 'msg-' + Date.now();
                newMsg.createdAt = new Date().toISOString();
                newMsg.status = 'Pendente';

                const msgPath = path.join(BASE_DIR, 'messages.json');
                const currentMsgs = fs.existsSync(msgPath) ? JSON.parse(fs.readFileSync(msgPath, 'utf-8') || '[]') : [];
                currentMsgs.unshift(newMsg);
                fs.writeFileSync(msgPath, JSON.stringify(currentMsgs, null, 2), 'utf-8');

                console.log(`[Contato] Nova mensagem recebida de: ${newMsg.name} (${newMsg.interest})`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, messageId: newMsg.id }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Servir Arquivos Estáticos
    if (reqUrl === '/') {
        reqUrl = '/index.html';
    }

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(BASE_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (!path.extname(filePath)) {
                const indexPath = path.join(BASE_DIR, 'index.html');
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
                fs.createReadStream(indexPath).pipe(res);
                return;
            }
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 - Arquivo não encontrado');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Arquivos JSON dinâmicos nunca são cacheados pelo browser
        const isDynamicJson = ['theme.json', 'content.json', 'animals.json', 'messages.json'].includes(path.basename(filePath));
        const cacheControl = isDynamicJson
            ? 'no-cache, no-store, must-revalidate'
            : 'no-cache';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': cacheControl
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`  Patas & Esperança - Landing Page & CMS em Tempo Real`);
    console.log(`  Servidor Ativo em: http://localhost:${PORT}`);
    console.log(`  API Persistência: http://localhost:${PORT}/api/content`);
    console.log(`  Sincronização Multi-dispositivo: Ativa via Polling / API`);
    console.log(`=============================================================\n`);
});
