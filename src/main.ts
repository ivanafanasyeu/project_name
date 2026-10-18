import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Program Capacity API')
      .setDescription('API for program capacity and invoice reservations.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, swaggerDocument);
  }

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      postfixId: '',
      client: {
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092')
          .split(',')
          .map((broker) => broker.trim()),
        clientId: 'capacity-service',
        retry: {
          initialRetryTime: Number(
            process.env.KAFKA_RETRY_INITIAL_TIME_MS ?? 300,
          ),
          multiplier: Number(process.env.KAFKA_RETRY_MULTIPLIER ?? 2),
          maxRetryTime: Number(process.env.KAFKA_RETRY_MAX_TIME_MS ?? 30000),
          retries: Number(process.env.KAFKA_RETRY_COUNT ?? 5),
        },
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID ?? 'capacity-service',
      },
      subscribe: {
        fromBeginning: true,
      },
      parser: {
        keepBinary: true,
      },
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
