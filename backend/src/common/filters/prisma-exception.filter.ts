import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      response.status(status).json(typeof res === 'string' ? { statusCode: status, message: res } : res);
      return;
    }

    if (exception?.name === 'PrismaClientKnownRequestError') {
      switch (exception.code) {
        case 'P2025': {
          const target = exception.meta?.cause || 'Record';
          response.status(404).json({ statusCode: 404, message: `${target} not found` });
          return;
        }
        case 'P2002': {
          const target = exception.meta?.target || 'field';
          response.status(409).json({ statusCode: 409, message: `Unique constraint violation on ${target}` });
          return;
        }
        case 'P2003': {
          const field = exception.meta?.field_name || 'foreign key';
          response.status(400).json({ statusCode: 400, message: `Foreign key constraint failed: ${field}` });
          return;
        }
        case 'P2014': {
          response.status(400).json({ statusCode: 400, message: 'Required relation violation' });
          return;
        }
      }
    }

    if (exception?.name === 'PrismaClientValidationError') {
      const message = (exception.message || '').replace(/\n/g, ' ').slice(0, 500);
      response.status(400).json({ statusCode: 400, message: `Validation error: ${message}` });
      return;
    }

    console.error('Unhandled exception:', exception);
    response.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
