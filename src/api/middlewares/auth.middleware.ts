// src/api/middlewares/auth.middleware.ts

// 1. BU SATIRLARI SİLİN!
// 'dotenv.config()' sadece ana index.ts dosyasında,
// uygulamanın en başında çağrılmalıdır.
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 2. JWT Payload'umuzun (auth.service.ts'de oluşturduğumuz) 
// yapısını tanımlıyoruz.
interface JwtPayload {
  id: string;
  tenantId: string;
  username: string;
}

// 3. Express'in 'Request' tipini global olarak genişletiyoruz.
// Artık 'req.user' tüm projede tanınacak.
declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
    }
  }
}

// 4. Secret'ı oku (dotenv.config() ana index.ts'de çalıştığı için
// bu değişken dolu olacaktır)
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
      // 5. Hata mesajlarını daha net hale getiriyoruz (Frontend için).
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Geçersiz Token (İmza Hatası).' });
      }
      // Diğer beklenmedik hatalar için
      return res.status(403).json({ message: 'Token doğrulanamadı.' });
    }

    // Doğrulama başarılı, kullanıcı bilgisini req objesine ekle
    req.user = user as JwtPayload; 
    
    next(); // Bir sonraki middleware'e (veya controller'a) geç
  });
};