import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['verbose'],
  });
  const configService = app.get(ConfigService);

  /** VALIDATION */
  // I can add useGlobal methods if the class within doesn't use dependecy injection
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // removes extra properties from the request body
      forbidNonWhitelisted: true, // returns an errors if there is an extra property
      transform: true, //transform the controllers inputs to class instances or primitives
      transformOptions: {
        enableImplicitConversion: true, // transform the properties according to a class validations
      },
    }),
  );

  // SWAGGER
  const options = new DocumentBuilder()
    .setTitle('Tasks App')
    .setDescription('Application for TODOs tasks')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('api', app, document);

  /** PORT */
  await app.listen(configService.get('PORT'));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>('RABBITMQ_URL')],
      queue: 'manager_queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  await app.startAllMicroservices();
}
bootstrap();
