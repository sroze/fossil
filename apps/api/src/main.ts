import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApplication } from './application/configure';

async function bootstrap() {
  const app = configureApplication(await NestFactory.create(AppModule));

  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
