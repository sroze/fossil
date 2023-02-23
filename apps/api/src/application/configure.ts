import { ValidationPipe, INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function configureApplication(app: INestApplication): INestApplication {
  const config = new DocumentBuilder()
    .setTitle('Fossil')
    .setDescription("Fossil's API")
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  return app;
}
