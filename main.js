// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const GIFEncoder = require('gifencoder');
const { PNG } = require('pngjs');
const sharp = require('sharp');
const WebP = require('node-webpmux');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('renderer.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('show-save-dialog', async (_e, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName
  });
  return canceled ? null : filePath;
});

ipcMain.handle('convert-svg-to-anim', async (_event, opts) => {
  try {
    const { svgText, width, height, fps, duration, loop, bgColor, outputPath, format } = opts;
    const totalFrames = Math.round(duration * fps);

    const renderWin = new BrowserWindow({
      show: false,
      width,
      height,
      webPreferences: { offscreen: true }
    });

    // Inject SVG + SMIL polyfill into hidden renderer
    const html = `
      <html>
        <head>
          <style>body{margin:0;background:${bgColor};}</style>
          <script src="https://unpkg.com/smil-polyfill/dist/smil.polyfill.min.js"></script>
        </head>
        <body>
          ${svgText}
        </body>
      </html>
    `;

    await renderWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    if (format === 'gif') {
      const encoder = new GIFEncoder(width, height);
      encoder.setRepeat(loop);
      encoder.setDelay(1000 / fps);
      encoder.setQuality(10);

      const stream = encoder.createReadStream();
      const out = fs.createWriteStream(outputPath);
      stream.pipe(out);

      encoder.start();

      for (let i = 0; i < totalFrames; i++) {
        const image = await renderWin.webContents.capturePage();
        const buffer = image.toPNG();
        const png = PNG.sync.read(buffer);
        encoder.addFrame(png.data);
        mainWindow.webContents.send('progress', { index: i + 1, total: totalFrames });
        await new Promise(r => setTimeout(r, 1000 / fps));
      }

      encoder.finish();
    } else if (format === 'webp') {
      const webpMux = new WebP.Image();
      const frames = [];

      for (let i = 0; i < totalFrames; i++) {
        const image = await renderWin.webContents.capturePage();
        const pngBuffer = image.toPNG();

        // Convert PNG ¡ú WebP
        const webpBuffer = await sharp(pngBuffer).webp({ quality: 90 }).toBuffer();

        frames.push({ data: webpBuffer, duration: 1000 / fps });
        mainWindow.webContents.send('progress', { index: i + 1, total: totalFrames });

        await new Promise(r => setTimeout(r, 1000 / fps));
      }

      await webpMux.saveAnimated(outputPath, frames, loop);
    }

    renderWin.close();
    return { success: true, path: outputPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
