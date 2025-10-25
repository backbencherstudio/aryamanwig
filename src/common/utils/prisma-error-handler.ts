import { Prisma } from '@prisma/client';
 
interface PrismaErrorResponse {
  success: false;
  message: string;
  error: string;
}
 
export function handlePrismaError(error: any): PrismaErrorResponse {
  console.error('❌ Prisma Error:', error);
 
  let message = 'An unexpected error occurred';
  let name = 'InternalServerError';
 
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta as any)?.target;
        const targetList = Array.isArray(target) ? target.join(', ') : String(target ?? 'unknown');
        message = `Duplicate value for field(s): ${targetList}`;
        name = 'ConflictError';
        break;
      }
      case 'P2003':
        message = 'Invalid reference value. Foreign key constraint failed.';
        name = 'BadRequestError';
        break;
      case 'P2011':
        message = 'Required field missing. Please fill all mandatory fields.';
        name = 'BadRequestError';
        break;
      case 'P2025':
        message = 'Record not found or already deleted.';
        name = 'NotFoundError';
        break;
      case 'P2000':
        message = 'Value too long for field.';
        name = 'BadRequestError';
        break;
      case 'P2001':
        message = 'Related record not found.';
        name = 'NotFoundError';
        break;
      case 'P2008':
        message = 'Invalid query or input.';
        name = 'BadRequestError';
        break;
      case 'P1001':
      case 'P1010':
        message = 'Database connection issue. Please try again later.';
        name = 'InternalServerError';
        break;
      default:
        message = error.message || 'Unknown database error occurred.';
        name = error.name || 'InternalServerError';
    }
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    message = error.message || 'Unknown database error occurred.';
    name = error.name || 'InternalServerError';
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    message = error.message || 'Validation failed.';
    name = 'BadRequestError';
  } else {
    message = error.message || 'Unexpected error occurred.';
    name = error.name || 'InternalServerError';
  }
 
  return {
    success: false,
    message,
    error: name,
  };
}
 