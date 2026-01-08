// external imports
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import * as admin from "firebase-admin";

//internal imports
import appConfig from "../../config/app.config";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRepository } from "../../common/repository/user/user.repository";
import { MailService } from "../../mail/mail.service";
import { UcodeRepository } from "../../common/repository/ucode/ucode.repository";
import { UpdateUserDto } from "./dto/update-user.dto";
import { SojebStorage } from "../../common/lib/Disk/SojebStorage";
import { DateHelper } from "../../common/helper/date.helper";
import { StripePayment } from "../../common/lib/Payment/stripe/StripePayment";
import { StringHelper } from "../../common/helper/string.helper";
import { log } from "node:console";
import { MessageGateway } from "../chat/message/message.gateway";
import { NotificationRepository } from "src/common/repository/notification/notification.repository";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private readonly messageGateway: MessageGateway,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // get user details
  async me(userId: string) {
    try {
      const useractive = await this.prisma.user.findFirst({
        where: {
          id: userId,
          status: 1,
        },
      });

      if (!useractive) {
        return {
          success: false,
          message: "User is not active",
        };
      }

      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          status: 1,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          avatar: true,
          address: true,
          phone_number: true,
          type: true,
          cover_photo: true,
          gender: true,
          date_of_birth: true,
          created_at: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      if (user.avatar) {
        user["avatar_url"] = SojebStorage.url(
          `${appConfig().storageUrl.avatar}/${user.avatar}`,
        );
      }

      if (user.cover_photo) {
        user["cover_photo_url"] = SojebStorage.url(
          `${appConfig().storageUrl.coverPhoto}/${user.cover_photo}`,
        );
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: "User not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // register user
  // ...existing code...

  // ...existing code...

  async register({
    name,
    first_name,
    last_name,
    email,
    location,
    password,
    type,
    contact_number,
  }: {
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    location: string;
    password: string;
    contact_number: string;
    type?: string;
  }) {
    try {
      // Check if email already exist
      const userEmailExist = await UserRepository.exist({
        field: "email",
        value: String(email),
      });

      if (userEmailExist) {
        return {
          success: false,
          statusCode: 401,
          message: "Email already exist",
        };
      }

      const user = await UserRepository.createUser({
        name: name,
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password,
        location: location,
        contact_number: contact_number,
        type: type,
      });

      console.log("User Creation Result:", user); // Debug log

      // Fix: Check if user creation failed
      if (!user || !user.data || !user.data.id) {
        return {
          success: false,
          message: user?.message || "Failed to create account",
        };
      }

      // create stripe customer account
      const stripeCustomer = await StripePayment.createCustomer({
        user_id: user.data.id,
        email: email,
        name: name,
      });

      console.log("Stripe Customer", stripeCustomer);

      if (stripeCustomer) {
        await this.prisma.user.update({
          where: {
            id: user.data.id,
          },
          data: {
            billing_id: stripeCustomer.id,
          },
        });
      }

      //  create otp code
      const token = await UcodeRepository.createToken({
        userId: user.data.id,
        isOtp: true,
      });

      //send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: name,
        otp: token,
      });

      // add notification for new user registration to admin
      const adminUser = await UserRepository.getAdminUser();

      if (adminUser) {
        const notificationPayload: any = {
          sender_id: user.data.id,
          receiver_id: adminUser.id,
          text: "New user registered",
          type: "new_user",
        };

        const userSocketId = this.messageGateway.clients.get(adminUser.id);

        if (userSocketId) {
          this.messageGateway.server
            .to(userSocketId)
            .emit("notification", notificationPayload);
        }
        await NotificationRepository.createNotification(notificationPayload);
      }

      return {
        success: true,
        message: "We have sent a verification code to your email",
      };
    } catch (error) {
      console.error("Registration Error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  }

  // ...existing code...

  // ...existing code...

  // login user
  async login({
    email,
    userId,
    fcm_token,
  }: {
    email: string;
    userId: string;
    fcm_token?: string;
  }) {
    const userActive = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: 1,
      },
    });

    if (!userActive) {
      return {
        success: false,
        message: "Please wait for admin approval",
      };
    }

    try {
      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            fcm_token: fcm_token,
          },
        });
      }
      // ---------------------------------------------------------

      const payload = { email: email, sub: userId, type: "user" };

      const accessToken = this.jwtService.sign(payload, { expiresIn: "10d" });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "30d" });

      const user = await UserRepository.getUserDetails(userId);

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        "EX",
        60 * 60 * 24 * 7,
      );

      return {
        success: true,
        message: "Logged in successfully",
        authorization: {
          type: "bearer",
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        userid: user.id,
        type: user.type,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // update user
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
    cover_image?: Express.Multer.File,
  ) {
    try {
      const data: any = {};
      // if (updateUserDto.name) {
      //   data.name = updateUserDto.name;
      // }
      if (updateUserDto.first_name) {
        data.first_name = updateUserDto.first_name;
      }
      if (updateUserDto.last_name) {
        data.last_name = updateUserDto.last_name;
      }
      // if (updateUserDto.phone_number) {
      //   data.phone_number = updateUserDto.phone_number;
      // }
      // if (updateUserDto.country) {
      //   data.country = updateUserDto.country;
      // }
      // if (updateUserDto.state) {
      //   data.state = updateUserDto.state;
      // }
      // if (updateUserDto.local_government) {
      //   data.local_government = updateUserDto.local_government;
      // }
      if (updateUserDto.city) {
        data.city = updateUserDto.city;
      }
      if (updateUserDto.phone_number) {
        data.phone_number = updateUserDto.phone_number;
      }

      // if (updateUserDto.zip_code) {
      //   data.zip_code = updateUserDto.zip_code;
      // }
      if (updateUserDto.address) {
        data.address = updateUserDto.address;
      }
      if (updateUserDto.gender) {
        data.gender = updateUserDto.gender;
      }
      if (updateUserDto.date_of_birth) {
        data.date_of_birth = DateHelper.format(updateUserDto.date_of_birth);
      }

      // ====== Avatar upload ======

      if (image) {
        // delete old image from storage
        const oldImage = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });
        if (oldImage.avatar) {
          await SojebStorage.delete(
            appConfig().storageUrl.avatar + oldImage.avatar,
          );
        }

        // upload file
        const originalName = image.originalname.replace(/\s+/g, "");
        const fileName = `${StringHelper.randomString()}${originalName}`;
        await SojebStorage.put(
          appConfig().storageUrl.avatar + "/" + fileName,
          image.buffer,
        );

        data.avatar = fileName;
      }

      // ====== Cover Photo upload ======
      if (cover_image) {
        // delete old image from storage
        const oldCoverPhoto = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { cover_photo: true },
        });

        if (oldCoverPhoto.cover_photo) {
          await SojebStorage.delete(
            appConfig().storageUrl.coverPhoto + oldCoverPhoto.cover_photo,
          );
        }

        // upload file
        const originalName = cover_image.originalname.replace(/\s+/g, "");
        const fileName = `${StringHelper.randomString()}${originalName}`;
        await SojebStorage.put(
          appConfig().storageUrl.coverPhoto + "/" + fileName,
          cover_image.buffer,
        );

        data.cover_photo = fileName;
      }

      const user = await UserRepository.getUserDetails(userId);
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
          },
        });

        return {
          success: true,
          message: "User updated successfully",
        };
      } else {
        return {
          success: false,
          message: "User not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };

      // return handlePrismaError(error);
    }
  }

  // Refresh Token
  async refreshToken(user_id: string, refreshToken: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);

      if (!storedToken || storedToken != refreshToken) {
        return {
          success: false,
          message: "Refresh token is required",
        };
      }

      if (!user_id) {
        return {
          success: false,
          message: "User not found",
        };
      }

      const userDetails = await UserRepository.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: "User not found",
        };
      }

      const payload = { email: userDetails.email, sub: userDetails.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });

      return {
        success: true,
        authorization: {
          type: "bearer",
          access_token: accessToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Logout
  async revokeRefreshToken(user_id: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);
      if (!storedToken) {
        return {
          success: false,
          message: "Refresh token not found",
        };
      }

      await this.redis.del(`refresh_token:${user_id}`);

      return {
        success: true,
        message: "Refresh token revoked successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // --------------Google Login -----------------

  // *forgot password
  async forgotPassword(email) {
    try {
      const user = await UserRepository.exist({
        field: "email",
        value: email,
      });

      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: "We have sent an OTP code to your email",
        };
      } else {
        return {
          success: false,
          message: "Email not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // *reset token
  async resendToken(email: string) {
    try {
      const user = await UserRepository.exist({
        field: "email",
        value: email,
      });
      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });
        return {
          success: true,
          message: "We have sent an OTP code to your email",
        };
      } else {
        return {
          success: false,
          message: "Email not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // * verify token
  async verifyToken({ email, token }) {
    try {
      const user = await UserRepository.exist({
        field: "email",
        value: email,
      });

      if (!user) {
        return {
          success: false,
          message: "Email not found",
        };
      }

      const didVerify = await UcodeRepository.validateToken3({
        email: email,
        token: token,
      });

      if (didVerify) {
        return {
          success: true,
          message: "Token verified successfully",
        };
      } else {
        return {
          success: false,
          message: "Invalid, expired, or already used token",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to verify token",
      };
    }
  }

  async resetPassword({ email, token, password }) {
    try {
      const verificationCheck = await UcodeRepository.checkVerifiedToken({
        email: email,
        token: token,
      });

      if (!verificationCheck.valid) {
        return {
          success: false,
          message: verificationCheck.message,
        };
      }

      await UserRepository.changePassword({
        email: email,
        password: password,
      });

      await UcodeRepository.deleteToken({
        email: email,
        token: token,
      });

      return {
        success: true,
        message: "Password updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // *verify email to verify the email
  async verifyEmail({ email, token }) {
    try {
      const user = await UserRepository.exist({
        field: "email",
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: "Email verified successfully",
          };
        } else {
          return {
            success: false,
            message: "Invalid token ",
          };
        }
      } else {
        return {
          success: false,
          message: "Email not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const user = await UserRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        const sndOtp = await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });
        console.log("Resend Otp : ", sndOtp);

        return {
          success: true,
          message: "We have sent a verification code to your email",
        };
      } else {
        return {
          success: false,
          message: "Email not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await UserRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await UserRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: "Password updated successfully",
          };
        } else {
          return {
            success: false,
            message: "Invalid password",
          };
        }
      } else {
        return {
          success: false,
          message: "Email not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: "We have sent an OTP code to your email",
        };
      } else {
        return {
          success: false,
          message: "User not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await UserRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: "Email updated successfully",
          };
        } else {
          return {
            success: false,
            message: "Invalid token",
          };
        }
      } else {
        return {
          success: false,
          message: "User not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await UserRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        const { password, ...result } = user;
        if (user.is_two_factor_enabled) {
          if (token) {
            const isValid = await UserRepository.verify2FA(user.id, token);
            if (!isValid) {
              throw new UnauthorizedException("Invalid token");
              // return {
              //   success: false,
              //   message: 'Invalid token',
              // };
            }
          } else {
            throw new UnauthorizedException("Token is required");
            // return {
            //   success: false,
            //   message: 'Token is required',
            // };
          }
        }
        return result;
      } else {
        throw new UnauthorizedException("Password not matched");
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException("Email not found");
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  // --------- 2FA ---------
  async generate2FASecret(user_id: string) {
    try {
      return await UserRepository.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verify2FA(user_id: string, token: string) {
    try {
      const isValid = await UserRepository.verify2FA(user_id, token);
      if (!isValid) {
        return {
          success: false,
          message: "Invalid token",
        };
      }
      return {
        success: true,
        message: "2FA verified successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async enable2FA(user_id: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        await UserRepository.enable2FA(user_id);
        return {
          success: true,
          message: "2FA enabled successfully",
        };
      } else {
        return {
          success: false,
          message: "User not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async disable2FA(user_id: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        await UserRepository.disable2FA(user_id);
        return {
          success: true,
          message: "2FA disabled successfully",
        };
      } else {
        return {
          success: false,
          message: "User not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------

  // Firebase Google Authentication
  async firebaseGoogleAuth(idToken: string, fcm_token?: string) {
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException("Email not found in Firebase token");
      }

      // Check if user already exists
      let user = await this.prisma.user.findUnique({
        where: { email: email },
      });

      // If user doesn't exist, create a new user
      if (!user) {
        const nameParts = name ? name.split(" ") : ["", ""];
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        user = await this.prisma.user.create({
          data: {
            email: email,
            first_name: firstName,
            last_name: lastName,
            avatar: picture || null,
            googleId: uid,
            email_verified_at: new Date(),
            status: 1,
          },
        });

        // Create Stripe customer
        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          name: name || email,
          email: email,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      }

      // Update FCM token if provided
      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { fcm_token: fcm_token },
        });
      }

      // Generate JWT tokens
      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

      // Store refresh token in Redis
      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        "EX",
        60 * 60 * 24 * 7, // 7 days
      );

      return {
        success: true,
        message: "Logged in successfully via Firebase",
        authorization: {
          type: "bearer",
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar,
          type: user.type,
        },
      };
    } catch (error) {
      throw new UnauthorizedException(
        `Firebase authentication failed: ${error.message}`,
      );
    }
  }

  // Firebase Apple Authentication
  async firebaseAppleAuth(idToken: string, fcm_token?: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException("Email not found in Firebase token");
      }

      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        const nameParts = name ? name.split(" ") : ["", ""];
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        user = await this.prisma.user.create({
          data: {
            email,
            first_name: firstName,
            last_name: lastName,
            avatar: picture || null,
            apple_id: uid,
            email_verified_at: new Date(),
            status: 1,
          },
        });

        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          name: name || email,
          email,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      }

      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { fcm_token },
        });
      }

      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        "EX",
        60 * 60 * 24 * 7,
      );

      return {
        success: true,
        message: "Logged in successfully via Firebase (Apple)",
        authorization: {
          type: "bearer",
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar,
          type: user.type,
        },
      };
    } catch (error) {
      throw new UnauthorizedException(
        `Firebase authentication failed: ${error.message}`,
      );
    }
  }

  // google login
  // google log in using passport.js

  async googleLogin({ email, userId }: { email: string; userId: string }) {
    try {
      const payload = { email: email, sub: userId };

      const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

      const user = await UserRepository.getUserDetails(userId);

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        "EX",
        60 * 60 * 24 * 7, // 7 days expiration
      );

      // Return response with tokens
      return {
        // success: true,
        message: "Logged in successfully",
        authorization: {
          type: "bearer",
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        type: user.type,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // apple login

  async appleLogin({
    email,
    userId,
    aud,
  }: {
    email: string;
    userId: string;
    aud: string;
  }) {
    try {
      const payload = { email, sub: userId, aud };

      const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

      const user = await UserRepository.getUserDetails(userId);

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        "EX",
        60 * 60 * 24 * 7,
      );

      // create stripe customer account id
      try {
        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      } catch (error) {
        return {
          success: false,
          message: "User created but failed to create billing account",
        };
      }

      return {
        message: "Logged in successfully",
        authorization: {
          type: "bearer",
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        type: user.type,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
