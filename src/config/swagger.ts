import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Feature Toggle Service API',
      version: '1.0.0',
      description: 'A simple service to manage feature flags for multiple tenants and environments.',
    },
    servers: [
      {
        url: 'http://localhost:5001', // Geliştirme sunucunuzun adresi
        description: 'Development server',
      },
    ],
    // JWT için güvenlik şeması tanımı
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ]
  },
  // API endpoint'lerini içeren dosyaların yolları.
  // Bu dosyaları tarayarak dokümantasyonu oluşturacak.
  apis: ['./src/api/routes/*.ts'], 
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Swagger UI'ı sunacak olan endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Dokümantasyonun JSON halini görmek isterseniz (opsiyonel)
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Swagger UI is available at /api-docs');
}