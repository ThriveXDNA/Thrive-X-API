import swaggerJsDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ThriveX API',
      version: '1.0.0',
      description: 'Carnivore Diet Analysis and Review API',
      contact: {
        name: 'API Support',
        email: 'support@thrivex.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/api/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

export default swaggerDocs;