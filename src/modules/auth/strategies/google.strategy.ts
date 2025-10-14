import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import appConfig from '../../../config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    super({
      clientID: appConfig().auth.google.app_id,
      clientSecret: appConfig().auth.google.app_secret,
      callbackURL: appConfig().auth.google.callback,
      scope: ['email', 'profile', 'openid'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    console.log('Google profile data:', JSON.stringify(profile, null, 2));


    const { id, name, emails, photos } = profile;

    let user = await this.prisma.user.findUnique({
      where: {
        googleId: id,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId: id,
          email: emails[0].value,
          first_name: name.givenName,
          last_name: name.familyName,
          avatar: photos[0].value,
          accessToken,
          refreshToken,
        },
      });
    }

    // এবার Stripe এ Customer তৈরি করো
    const stripeCustomer = await StripePayment.createCustomer({
      user_id: user.id,
      name: `${name.givenName} ${name.familyName}`,
      email: emails[0].value,
    });


    if (stripeCustomer) {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            billing_id: stripeCustomer.id,
          },
        });
    }

    const loginResponse = await this.authService.googleLogin({
      email: user.email,
      userId: user.id,
    });

    done(null, { user, loginResponse });
  }
}