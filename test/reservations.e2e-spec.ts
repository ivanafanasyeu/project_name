import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { DataSource } from 'typeorm';
import { CapacityMovement } from '../src/database/capacity-movement.entity.js';
import { Program } from '../src/database/program.entity.js';
import { Reservation } from '../src/database/reservation.entity.js';
import { configureApp } from '../src/configure-app.js';
import type { ReserveReservationDto } from '../src/reservations/reserve-reservation.dto.js';

const authEnvironment = {
  JWT_MODE: 'dev',
  JWT_SECRET: 'reservations-e2e-test-secret',
  JWT_ISSUER: 'reservations-e2e-test-issuer',
  JWT_AUDIENCE: 'reservations-e2e-test-audience',
};

const amountLimit = '9223372036854775807';

describe('Reservations (e2e)', () => {
  const previousEnvironment = new Map<string, string | undefined>();
  let app: Awaited<
    ReturnType<import('@nestjs/common').INestApplication['init']>
  >;
  let server: Server;
  let dataSource: DataSource;
  let token: string;

  function reserve(programId: string, body: ReserveReservationDto) {
    return request(server)
      .post(`/programs/${programId}/reservations`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  beforeAll(async () => {
    for (const [key, value] of Object.entries(authEnvironment)) {
      previousEnvironment.set(key, process.env[key]);
      process.env[key] = value;
    }

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0);
    server = app.getHttpServer();

    dataSource = app.get(DataSource);
    token = await app.get(JwtService).signAsync({ sub: 'reservations-e2e' });
  });

  afterAll(async () => {
    await app?.close();
    for (const [key, value] of previousEnvironment) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  async function createProgram(currency: string, limitMinor: string) {
    return dataSource.getRepository(Program).save(
      dataSource.getRepository(Program).create({
        currency,
        limitMinor,
        reservedMinor: '0',
        lastTreasurySeq: '0',
      }),
    );
  }

  it('rejects a reservation above capacity and rolls back reservation and movement', async () => {
    const program = await createProgram('USD', '10');

    const response = await reserve(program.id, {
      invoiceId: 'over-capacity',
      amount: '11',
      currency: 'USD',
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('INSUFFICIENT_CAPACITY');
    expect(
      await dataSource.getRepository(Reservation).countBy({
        programId: program.id,
      }),
    ).toBe(0);
    expect(
      await dataSource.getRepository(CapacityMovement).countBy({
        programId: program.id,
      }),
    ).toBe(0);
    expect(
      (
        await dataSource.getRepository(Program).findOneByOrFail({
          id: program.id,
        })
      ).reservedMinor,
    ).toBe('0');
  });

  it('allows exactly ten concurrent distinct invoices with a capacity limit of ten', async () => {
    const program = await createProgram('USD', '10');
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        reserve(program.id, {
          invoiceId: `concurrent-${index}`,
          amount: '1',
          currency: 'USD',
        }),
      ),
    );

    expect(responses.filter(({ status }) => status === 201)).toHaveLength(10);
    expect(responses.filter(({ status }) => status === 422)).toHaveLength(10);
    expect(
      await dataSource.getRepository(Reservation).countBy({
        programId: program.id,
      }),
    ).toBe(10);
    expect(
      await dataSource.getRepository(CapacityMovement).countBy({
        programId: program.id,
      }),
    ).toBe(10);
    expect(
      (
        await dataSource.getRepository(Program).findOneByOrFail({
          id: program.id,
        })
      ).reservedMinor,
    ).toBe('10');
  });

  it('creates one reservation and movement for concurrent replays of one invoice', async () => {
    const program = await createProgram('USD', '100');
    const invoiceId = 'concurrent-single-invoice';

    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        reserve(program.id, {
          invoiceId,
          amount: '7',
          currency: 'USD',
        }),
      ),
    );

    expect(
      responses.every(({ status }) => status === 200 || status === 201),
    ).toBe(true);
    expect(responses.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(responses.filter(({ status }) => status === 200)).toHaveLength(19);
    expect(new Set(responses.map(({ body }) => body.id)).size).toBe(1);
    expect(
      await dataSource.getRepository(Reservation).countBy({
        programId: program.id,
      }),
    ).toBe(1);
    expect(
      await dataSource.getRepository(CapacityMovement).countBy({
        programId: program.id,
      }),
    ).toBe(1);
    expect(
      (
        await dataSource.getRepository(Program).findOneByOrFail({
          id: program.id,
        })
      ).reservedMinor,
    ).toBe('7');
  });

  it('rejects a different payload for the same invoice without changing state', async () => {
    const program = await createProgram('USD', '100');
    const invoiceId = 'different-payload-invoice';
    const initialResponse = await reserve(program.id, {
      invoiceId,
      amount: '7',
      currency: 'USD',
    });
    expect(initialResponse.status).toBe(201);

    const beforeProgram = await dataSource
      .getRepository(Program)
      .findOneByOrFail({ id: program.id });
    const beforeReservations = await dataSource
      .getRepository(Reservation)
      .countBy({ programId: program.id });
    const beforeMovements = await dataSource
      .getRepository(CapacityMovement)
      .countBy({ programId: program.id });

    const response = await reserve(program.id, {
      invoiceId,
      amount: '8',
      currency: 'USD',
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('RESERVATION_PAYLOAD_CONFLICT');
    expect(
      (
        await dataSource.getRepository(Program).findOneByOrFail({
          id: program.id,
        })
      ).reservedMinor,
    ).toBe(beforeProgram.reservedMinor);
    expect(
      await dataSource.getRepository(Reservation).countBy({
        programId: program.id,
      }),
    ).toBe(beforeReservations);
    expect(
      await dataSource.getRepository(CapacityMovement).countBy({
        programId: program.id,
      }),
    ).toBe(beforeMovements);
  });

  it('converts EUR minor units to USD and stores the FX rate and converted amount', async () => {
    const program = await createProgram('USD', amountLimit);

    const response = await reserve(program.id, {
      invoiceId: 'eur-invoice',
      amount: '100',
      currency: 'EUR',
    });

    expect(response.status).toBe(201);
    expect(response.body.originalAmountMinor).toBe('100');
    expect(response.body.originalCurrency).toBe('EUR');
    expect(response.body.fxRate).toBe('1.086956521739');
    expect(response.body.reservedAmountMinor).toBe('109');

    const reservation = await dataSource
      .getRepository(Reservation)
      .findOneByOrFail({ programId: program.id, invoiceId: 'eur-invoice' });
    expect(reservation.fxRate).toBe('1.086956521739');
    expect(reservation.reservedAmountMinor).toBe('109');
    expect(
      (
        await dataSource.getRepository(Program).findOneByOrFail({
          id: program.id,
        })
      ).reservedMinor,
    ).toBe('109');
  });
});
