import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
    app.enableCors();
  
    app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
    app.useGlobalFilters(new AllExceptionsFilter());
  
    app.useGlobalInterceptors(new TransformResponseInterceptor());
  
    const config = new DocumentBuilder()
    .setTitle('Memorium API')
    .setDescription('API для приложения интервального повторения Memorium')
    .setVersion('1.0')
    .addTag('auth', 'Аутентификация')
    .addTag('modules', 'Модули обучения')
    .addTag('cards', 'Карточки')
    .addTag('examples', 'Примеры использования')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
