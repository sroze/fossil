import { CommandFactory } from 'nest-commander';
import { AppModule } from '../app.module';

require('dotenv').config();

async function bootstrap() {
  await CommandFactory.run(AppModule);
}

void bootstrap();
