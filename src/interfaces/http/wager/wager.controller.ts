import {
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Res,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvalidMoneyError, Money } from '../../../domain/shared/money';
import { WagerTransactionStatus } from '../../../domain/wager-transaction/wager-transaction-status';
import {
  IdempotencyConflictError,
  ProcessWagerTransactionUseCase,
  ReferenceAlreadyReversedError,
  ReferenceMismatchError,
  ReversalAmountMismatchError,
  WalletNotFoundError,
} from '../../../application/wager-transaction/process-wager-transaction.use-case';
import { SubmitWagerDto } from './dto/submit-wager.dto';
import { hashBusinessPayload } from './canonical-payload';

@Controller('wagering/transactions')
export class WagerController {
  constructor(private readonly processWagerTransactionUseCase: ProcessWagerTransactionUseCase) {}

  @Post()
  async submit(
    @Body() dto: SubmitWagerDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Res({ passthrough: true }) response?: Response,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new HttpException('Idempotency-Key header is required', HttpStatus.BAD_REQUEST);
    }

    let result;
    try {
      result = await this.processWagerTransactionUseCase.execute({
        ...dto,
        idempotencyKey: idempotencyKey.trim(),
        money: Money.from(dto.money),
        payloadHash: hashBusinessPayload(dto),
      });
    } catch (error) {
      this.mapError(error);
    }
    const transaction = result.transaction;
    if (transaction.status === WagerTransactionStatus.PendingReference) {
      response?.status(HttpStatus.ACCEPTED);
    } else if (transaction.status === WagerTransactionStatus.Rejected) {
      response?.status(HttpStatus.UNPROCESSABLE_ENTITY);
    } else {
      response?.status(HttpStatus.CREATED);
    }

    return {
      transactionId: transaction.id,
      status: transaction.status,
      balance: result.balance.toJSON(),
      idempotentReplay: result.idempotentReplay,
    };
  }

  private mapError(error: unknown): never {
    if (error instanceof InvalidMoneyError) throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    if (error instanceof IdempotencyConflictError) throw new ConflictException(error.message);
    if (error instanceof WalletNotFoundError) throw new NotFoundException(error.message);
    if (
      error instanceof ReferenceAlreadyReversedError ||
      error instanceof ReferenceMismatchError ||
      error instanceof ReversalAmountMismatchError
    ) throw new UnprocessableEntityException(error.message);
    throw new ServiceUnavailableException('Transaction processing is temporarily unavailable');
  }
}
