import { getDeterministicJobId } from '../src/utils/idempotency';

describe('Idempotency Utilities', () => {
  it('should generate a consistent deterministic BullMQ job ID', () => {
    const emailId = 'a47c593c-238d-4f27-9c92-3cb5a3297a73';
    const jobId1 = getDeterministicJobId(emailId);
    const jobId2 = getDeterministicJobId(emailId);

    expect(jobId1).toBe(`email-${emailId}`);
    expect(jobId1).toBe(jobId2);
  });
});
