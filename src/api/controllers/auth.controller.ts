// src/api/controllers/auth.controller.ts
import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre zorunludur.' });
    }

    const { token, user } = await authService.loginUser(username, password);

    res.status(200).json({ token, user });

  } catch (error: any) {
    console.error('Login hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
};