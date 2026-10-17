import { parseAndValidateEmails, isValidEmail } from '../src/utils/csv';

describe('CSV & Email Parsing Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('john.doe+work@reachinbox.ai')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('missingdomain@')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
    });
  });

  describe('parseAndValidateEmails', () => {
    it('should parse, clean headers, and deduplicate emails', () => {
      const csv = `email
john@example.com
alex@example.com
john@example.com
invalid-email-address
sam@company.org
`;
      const result = parseAndValidateEmails(csv);

      expect(result.validEmails).toEqual([
        'john@example.com',
        'alex@example.com',
        'sam@company.org',
      ]);
      expect(result.duplicateCount).toBe(1);
      expect(result.invalidCount).toBe(1);
    });

    it('should handle commas, quotes and whitespace', () => {
      const csv = `"Alex Brown", alex@company.com
"Sarah Lee", sarah@company.com
`;
      const result = parseAndValidateEmails(csv);
      expect(result.validEmails).toEqual(['alex@company.com', 'sarah@company.com']);
    });
  });
});
