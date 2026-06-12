import { describe, it, expect, mock } from 'bun:test';

type VerifyCallback = (
  payload: { userId: string },
  done: (error: Error | null, user: unknown) => void
) => Promise<void>;

let capturedVerify: VerifyCallback | null = null;

const mockUse = mock(() => undefined);
const mockFindFirst = mock(async () => null);

mock.module('passport', () => ({
  default: {
    use: mockUse,
  },
}));

mock.module('passport-jwt', () => ({
  Strategy: class {
    constructor(_opts: unknown, verify: VerifyCallback) {
      capturedVerify = verify;
    }
  },
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: mock(() => 'jwt-extractor'),
  },
}));

mock.module('../config/database', () => ({
  prisma: {
    user: {
      findFirst: mockFindFirst,
    },
  },
}));

const { configurePassport } = await import('../config/passport');

describe('configurePassport', () => {
  it('rejects JWTs for deleted or missing users', async () => {
    mockUse.mockClear();
    mockFindFirst.mockClear();
    mockFindFirst.mockResolvedValueOnce(null);

    configurePassport();

    const done = mock(() => undefined);
    await capturedVerify?.({ userId: 'user-1' }, done);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', deletedAt: null },
    });
    expect(done).toHaveBeenCalledWith(null, false);
  });
});
