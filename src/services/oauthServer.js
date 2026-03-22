/**
 * Simple OAuth callback server
 * Listens on 127.0.0.1:8000 and captures the authorization code from Spotify
 */

const http = require('http');

class OAuthServer {
  constructor() {
    this.server = null;
    this.authCode = null;
    this.codePromise = null;
    this.codeResolve = null;
  }

  /**
   * Start the OAuth callback server
   * @returns {Promise<void>}
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://127.0.0.1:8000');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          // User denied permission
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Authorization Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          if (this.codeResolve) {
            this.codeResolve(null);
          }
        } else if (code) {
          // Capture the code
          this.authCode = code;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>✅ Authorization Successful!</h1>
                <p>Your code: <code style="background: #f0f0f0; padding: 10px; border-radius: 5px;">${code}</code></p>
                <p style="color: #666;">This code has been automatically sent to your extension.</p>
                <p style="color: #666;">You can close this window now.</p>
              </body>
            </html>
          `);
          if (this.codeResolve) {
            this.codeResolve(code);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body>Invalid request</body></html>');
        }
      });

      this.server.listen(8000, '127.0.0.1', () => {
        console.log('OAuth callback server listening on http://127.0.0.1:8000');
        resolve();
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Wait for the authorization code
   * @returns {Promise<string|null>}
   */
  waitForCode(timeoutMs = 300000) {
    // 5 minute timeout
    return new Promise((resolve) => {
      this.codeResolve = resolve;

      const timeout = setTimeout(() => {
        this.codeResolve = null;
        resolve(null);
      }, timeoutMs);

      // If code already captured, resolve immediately
      if (this.authCode) {
        clearTimeout(timeout);
        resolve(this.authCode);
      }
    });
  }

  /**
   * Stop the OAuth callback server
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('OAuth callback server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = OAuthServer;
