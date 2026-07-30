import { NextFunction, Request, Response } from "express";


const allowedKeys = (process.env.AUTH_KEY_WHITELIST || "").split(",")

function parseBasicAuth(authHeader: string) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  const base64 = authHeader.slice(6); // remove "Basic "
  const credentials = Buffer.from(base64, 'base64').toString('utf-8');
  const [username, ...passwordParts] = credentials.split(':');
  const password = passwordParts.join(':'); // handle colons in passwords

  return { username, password, base64 };
}

export function checkAuth(req: Request, res: Response, next: NextFunction) : void {
  const authHeader = req.headers.authorization
  if (! authHeader || Array.isArray(authHeader) ) {
    res.status(401).send('Well-formed Basic Authentication header required');
    return    
  }


  const auth = parseBasicAuth(authHeader)
  if (auth == null) {
    res.status(401).send('Could not decode Basic Authentication header');
    return
  }

  if (allowedKeys.includes(auth.base64)) {
    console.log(`(Auth) SUCCESS - ${auth.username}`)
    next()
    return
  } else {
    console.log(`(Auth) DENIED - ${auth.username}`)
    res.status(401).send("Invalid username or password") 
    return
  }
};