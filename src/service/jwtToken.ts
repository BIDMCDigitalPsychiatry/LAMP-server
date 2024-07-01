
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.secret_key as string;

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: '401.missing-credentials' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '401.missing-credentials' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '403.invalid-token' });
    }

    if (typeof user !== 'object' || !user) {
      return res.status(403).json({ error: '403.invalid-token' });
    }

    const { access_key, secret_key } = user as { access_key: string, secret_key: string };

    // Set the Authorization header in the format expected by _createAuthSubject
    req.headers['authorization'] = `Basic ${Buffer.from(`${access_key}:${secret_key}`).toString('base64')}`;

    next();
  });
}
