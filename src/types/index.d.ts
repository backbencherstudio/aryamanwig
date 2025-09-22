declare namespace Express {
  export interface Request {
    user?: { id: string; userId: string; email: string; email_verified_at:string };
    rawBody: any;
  }
}
