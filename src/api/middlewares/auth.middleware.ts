// src/api/middlewares/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


interface JwtPayload {
  id: string;
  tenantId: string;
  username: string;
}


declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Güvenlik kontrolü: Eğer bir sebepten ötürü secret hala boşsa, hata ver ve dur.
  // Bu, ana index.ts'de dotenv.config() unuttuğunuz anlamına gelir.
  if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET ortam değişkeni bulunamadı. Ana index.ts dosyasını kontrol edin.");
    return res.status(500).json({ message: "Sunucu yapılandırma hatası." });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (token == null) {
    return res.status(401).json({ message: 'Erişim reddedildi. Token bulunamadı.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Geçersiz Token (İmza Hatası).' });
      }
      
      return res.status(403).json({ message: 'Token doğrulanamadı.' });
    }

   
    req.user = user as JwtPayload; 
    
    next(); 
  });
};