import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { openApiDocumentFromApplication } from '../../application/configure';
import { AppModule } from '../../app.module';

(async () => {
  const document = openApiDocumentFromApplication(
    await NestFactory.create(AppModule),
  );

  fs.writeFileSync(process.argv[2], JSON.stringify(document, null, 2));
})();
