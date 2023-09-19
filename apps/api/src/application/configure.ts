import { ValidationPipe, INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

export function openApiDocumentFromApplication(app: INestApplication) {
  const openApiConfig = new DocumentBuilder()
    .setTitle('Fossil')
    .setDescription("Fossil's API")
    .setVersion('1.0')
    .build();

  return SwaggerModule.createDocument(app, openApiConfig);
}

export function configureApplication(app: INestApplication): INestApplication {
  SwaggerModule.setup('docs', app, openApiDocumentFromApplication(app));

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  app.use(cookieParser());

  return app;
}
