
import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.secret_key as string;

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: '401.missing-token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '401.missing-token' });
  }

  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    console.log(secretKey)
    const {payload}: any = await jwtVerify(token, secretKey)
    console.log(payload)
 
    if (typeof payload !== 'object' || !payload) {
      return res.status(403).json({ error: '403.invalid-token' });
    }
    // const pld = jwtDecrypt(payload)
    const { access_key, secret_key } = payload as { access_key: string, secret_key: string };

    // Set the Authorization header in the format expected by _createAuthSubject
    req.headers['authorization'] = `Basic ${Buffer.from(`${access_key}:${secret_key}`).toString('base64')}`;
    next();
  } catch(err){
    return res.status(403).json({ error: '403.invalid-token' });
  }
}