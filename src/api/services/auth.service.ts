// src/api/services/auth.service.ts
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET ortam değişkeni tanımlanmamış!');
}

export const loginUser = async (username: string, password: string) => {
  // TODO: Gerçek bir kullanıcı veritabanı kontrolü burada yapılmalı.
  
  // Payload'a sahte bir 'id' ve 'tenantId' ekliyorum.
  // Gerçekte bu bilgiler veritabanından gelen kullanıcıdan alınmalıdır.
  const userPayload = {
    id: 'dummy-user-123', // Sahte kullanıcı ID'si
    tenantId: 'dummy-tenant-456', // Sahte tenant ID (rate limiting testi için)
    username: username,
  };

 
  const token = jwt.sign(
    userPayload,
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { token, user: userPayload };
};