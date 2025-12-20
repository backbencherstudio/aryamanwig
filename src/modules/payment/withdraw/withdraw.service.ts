import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreateWithdrawDto, WithdrawResponse } from './dto/create-withdraw.dto';
import { UpdateWithdrawDto } from './dto/update-withdraw.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Injectable()
export class WithdrawService {
  constructor(private readonly prisma: PrismaService) {}

  // Stripe Connected Account
  async createConnectedAccount(
    userId: string,
    email: string,
  ): Promise<{ accountId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.banking_id) {
      throw new BadRequestException('You already have a payout account');
    }

    try {
      // Create Stripe Connected Account
      const connectedAccount =
        await StripePayment.createConnectedAccount(email);

      // Save banking_id in user's profile
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          banking_id: connectedAccount.id,
        },
      });

      return { accountId: connectedAccount.id };
    } catch (error) {
      console.error('Connected account error:', error);
      throw new HttpException(
        'Failed to create payout account. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Stripe Connect Onboarding Link
  async createOnboardingLink(accountId: string): Promise<{ url: string }> {
    try {
      const accountLink =
        await StripePayment.createOnboardingAccountLink(accountId);
      return { url: accountLink.url };
    } catch (error) {
      console.error('Onboarding link error:', error);
      throw new HttpException(
        'Failed to create onboarding link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Withdraw Request
  async processWithdraw(
    userId: string,
    withdrawDto: CreateWithdrawDto,
  ): Promise<WithdrawResponse> {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a connected account
    if (!user.banking_id) {
      throw new BadRequestException('Please set up a payout account first');
    }

    const { amount, currency = 'usd' } = withdrawDto;

    // Check minimum withdraw amount
    if (amount < 1) {
      throw new BadRequestException('Minimum withdraw amount is 1 USD');
    }

    try {
      // Create Stripe Transfer (from platform to connected account)
      const transfer = await StripePayment.createTransfer(
        user.banking_id,
        amount,
        currency,
      );

      // Save transaction record
      await this.prisma.paymentTransaction.create({
        data: {
          user_id: userId,
          type: 'withdraw',
          withdraw_via: 'stripe',
          provider: 'stripe',
          reference_number: transfer.id,
          status: 'completed',
          amount: amount,
          currency: currency,
          paid_amount: amount,
          paid_currency: currency,
        },
      });

      return {
        success: true,
        message: 'Withdraw processed successfully',
        data: {
          transfer_id: transfer.id,
          amount: amount,
          currency: currency,
          status: 'completed',
        },
      };
    } catch (error) {
      // ব্যর্থ transaction record সেভ করি
      await this.prisma.paymentTransaction.create({
        data: {
          user_id: userId,
          type: 'withdraw',
          withdraw_via: 'stripe',
          provider: 'stripe',
          status: 'failed',
          amount: amount,
          currency: currency,
        },
      });

      throw new HttpException(
        'Failed to process withdraw. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Withdraw to Connected Account
  async withdrawToAccount(
    userId: string,
    accountId: string,
    withdrawDto: CreateWithdrawDto,
  ): Promise<WithdrawResponse> {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { amount, currency = 'usd' } = withdrawDto;

    if (amount < 1) {
      throw new BadRequestException('Minimum withdraw amount is 1 USD');
    }

    try {
      // Create Stripe Transfer
      const transfer = await StripePayment.createTransfer(
        accountId,
        amount,
        currency,
      );

      // Save transaction record
      await this.prisma.paymentTransaction.create({
        data: {
          user_id: userId,
          type: 'withdraw',
          withdraw_via: 'stripe',
          provider: 'stripe',
          reference_number: transfer.id,
          status: 'completed',
          amount: amount,
          currency: currency,
          paid_amount: amount,
          paid_currency: currency,
        },
      });

      return {
        success: true,
        message: 'Withdraw processed successfully',
        data: {
          transfer_id: transfer.id,
          amount: amount,
          currency: currency,
          status: 'completed',
        },
      };
    } catch (error) {
      console.error('Withdraw processing error:', error);
      throw new HttpException(
        'Failed to process withdraw. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Check Connected Account Balance
  async checkAccountBalance(userId: string) {
  
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { banking_id: true },
    });

    if (!user || !user.banking_id) {
      throw new BadRequestException('No connected account found');
    }

    try {

      const balance = await StripePayment.checkBalance(user.banking_id);

      const availableAmount = balance.available?.[0]?.amount || 0;
      const pendingAmount = balance.pending?.[0]?.amount || 0;
      const currency = balance.available?.[0]?.currency || 'usd';

      return {
        success: true,
        data: {
          available: {
            amount: availableAmount / 100, 
            amount_in_cents: availableAmount,
            currency: currency,
            display: `$${(availableAmount / 100).toFixed(2)} ${currency.toUpperCase()}`,
          },
          pending: {
            amount: pendingAmount / 100, 
            amount_in_cents: pendingAmount,
            currency: currency,
            display: `$${(pendingAmount / 100).toFixed(2)} ${currency.toUpperCase()}`,
          },
          total: {
            amount: (availableAmount + pendingAmount) / 100,
            display: `$${((availableAmount + pendingAmount) / 100).toFixed(2)} ${currency.toUpperCase()}`,
          },
        },
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      throw new HttpException(
        'Failed to check balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Withdraw History
  async getWithdrawHistory(userId: string) {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        user_id: userId,
        type: 'withdraw',
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      success: true,
      data: transactions,
    };
  }

  //Get Connected Account Info
  async getConnectedAccountInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        banking_id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: {
        hasConnectedAccount: !!user.banking_id,
        accountId: user.banking_id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
