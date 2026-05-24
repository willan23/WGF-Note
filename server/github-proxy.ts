/**
 * Backend Proxy Server for GitHub OAuth
 * 
 * This server handles secure token exchange for GitHub OAuth flow.
 * Run this in production to avoid exposing client secrets in the frontend.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081'],
  credentials: true,
}));
app.use(express.json());

// Rate limiting simple
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30; // 30 requests per minute

  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(ip, record);
  } else {
    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }
  }

  next();
};

app.use(rateLimit);

/**
 * POST /api/github/oauth/token
 * 
 * Exchange authorization code for access token.
 * This endpoint should be called from the mobile app after OAuth redirect.
 */
app.post('/api/github/oauth/token', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Validate state if provided (CSRF protection)
    if (state && state !== process.env.EXPECTED_STATE) {
      console.warn('State mismatch detected');
      // In production, you might want to reject this request
    }

    // Exchange code for token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('GitHub token exchange failed:', errorData);
      return res.status(400).json({ error: 'Failed to exchange code for token' });
    }

    const data = await response.json();

    // Don't send refresh token to client if you want to manage it server-side
    const { refresh_token, ...tokenData } = data;

    // Store refresh token securely if needed
    if (refresh_token) {
      // TODO: Store in database with user association
      console.log('Refresh token received - store securely');
    }

    res.json({
      success: true,
      data: tokenData,
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/github/oauth/refresh
 * 
 * Refresh an expired access token.
 */
app.post('/api/github/oauth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // TODO: Validate refresh token against your database

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to refresh token' });
    }

    const data = await response.json();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/github/user
 * 
 * Get current authenticated user info.
 * Proxies request to GitHub API with proper authentication.
 */
app.get('/api/github/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'WGF-Note-App',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      return res.status(response.status).json({ error: 'GitHub API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/github/webhook
 * 
 * Handle GitHub webhooks for real-time updates.
 */
app.post('/api/github/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'] as string;

    // Verify webhook signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
      console.warn('Webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log(`Received GitHub webhook: ${event}`);

    // Process different event types
    switch (event) {
      case 'push':
        // Handle push event
        console.log('Push event:', req.body.repository.full_name);
        break;

      case 'pull_request':
        // Handle PR event
        console.log('PR event:', req.body.action, req.body.pull_request.html_url);
        break;

      case 'issues':
        // Handle issue event
        console.log('Issue event:', req.body.action, req.body.issue.html_url);
        break;

      case 'ping':
        // Webhook test
        console.log('Webhook ping received');
        break;

      default:
        console.log('Unhandled event type:', event);
    }

    // TODO: Broadcast to connected clients via WebSocket
    // io.emit('github-update', { event, payload: req.body });

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GitHub OAuth Proxy Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
