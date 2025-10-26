import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import apiRoutes from './api/routes'; // Henüz oluşturmadık, bir sonraki adımda yapacağız.
import apiLimiter from './api/middlewares/rateLimit.middleware'; 
import { setupSwagger } from './config/swagger'; 


dotenv.config();


const app: Express = express();
const PORT = process.env.PORT || 5001;


app.use(cors());

app.use(express.json());

// Basit bir "Health Check" endpoint'i
// Servisin ayakta olup olmadığını kontrol etmek için kullanılır
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Feature Toggle Service is running!');
});

app.use('/api', apiLimiter);


app.use('/api', apiRoutes);
setupSwagger(app);

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
console.log("JWT Secret:", process.env.JWT_SECRET);

export default app; // Testler için app'i export ediyoruz