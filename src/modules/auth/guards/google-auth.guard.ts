import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import appConfig from 'src/config/app.config';

const prisma = new PrismaClient();

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super({
      clientID: appConfig().auth.google.app_id,
      clientSecret: appConfig().auth.google.app_secret,
      callbackURL: appConfig().auth.google.callback,
      scope: ['email', 'profile'],
    });
  }

  /**
   * Validate the Google profile and return user data.
   *
   * @param accessToken
   * @param refreshToken
   * @param profile
   * @param done
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id } = profile;
      const { givenName, familyName } = profile.name;
      const { value: email } = profile.emails[0];
      const { value: avatar } = profile.photos[0];

      // Check if user already exists in the database by email
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: `${givenName} ${familyName}`,
            avatar,
            type: 'user',
  
          },
        });
      }

      // Create JWT tokens (access and refresh)
      const payload = { email: user.email, sub: user.id };
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const newRefreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      // Store the refresh token in Redis
      await this.redis.set(
        `refresh_token:${user.id}`,
        newRefreshToken,
        'EX',
        60 * 60 * 24 * 7,
      );

      done(null, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error('Error in Google OAuth:', error);
      done(error, null);
    }
  }
}
