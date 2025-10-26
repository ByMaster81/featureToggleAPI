import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.resolve(__dirname, '../../../.env') });


import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Express'in Request tipini 'user' özelliği ile genişleten interface.
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
  };
}


export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401); // Unauthorized: Token yok
  }


  const secret = process.env.JWT_SECRET;

  // 3. HATA AYIKLAMA KONTROLLERİ:
  console.log('--- JWT VERIFICATION ---');
  console.log('Verifying token...');
  console.log('Secret read from environment:', secret);
  console.log('--------------------------');
  
  // Güvenlik kontrolü: Eğer bir sebepten ötürü secret hala boşsa, hata ver ve dur.
  if (!secret) {
    console.error("FATAL: JWT_SECRET could not be read from the environment.");
    return res.sendStatus(500); // Internal Server Error
  }

  
  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      // Doğrulama başarısız olursa (örn: invalid signature), hatayı logla ve 403 dön.
      console.error('JWT Verification Error:', err.message);
      return res.sendStatus(403); 
    }
    
  
    req.user = user;
    next();
  });
};