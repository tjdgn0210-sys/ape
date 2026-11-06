// 웹으로 내보낸 앱(web/)을 로컬 서버로 띄워 창에 보여 준다.
// 포트를 고정해 두면 localStorage(할 일·기록 저장)가 실행할 때마다 같은 곳을 쓴다.
const { app, BrowserWindow, Menu } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'web');
const PORT = 47831;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.map': 'application/json',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let file = path.normalize(path.join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.on('error', () => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    server.listen(PORT, '127.0.0.1', () => resolve(PORT));
  });
}

async function createWindow() {
  const port = await serve();
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 430, height: 900, minWidth: 360, minHeight: 600,
    title: '못지키면 유인원', backgroundColor: '#F5F5F5', autoHideMenuBar: true,
  });
  win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
