import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SmtpSendResult } from '../types/email.types';

export class SmtpService {
  private transporter: Transporter | null = null;
  private isInitialized = false;

  async getTransporter(): Promise<Transporter> {
    if (this.transporter && this.isInitialized) {
      return this.transporter;
    }

    let user = env.ETHEREAL_USER;
    let pass = env.ETHEREAL_PASSWORD;

    // If credentials are not configured in environment, auto-provision an Ethereal test account!
    if (!user || !pass) {
      try {
        logger.info('No Ethereal credentials provided in .env. Creating ephemeral Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        logger.info(`Ephemeral Ethereal account created: ${user}`);
      } catch (err: any) {
        logger.error('Failed to create Ethereal test account', { error: err.message });
      }
    }

    this.transporter = nodemailer.createTransport({
      host: env.ETHEREAL_HOST,
      port: env.ETHEREAL_PORT,
      secure: false,
      auth: {
        user: user || '',
        pass: pass || '',
      },
      pool: true,
      maxConnections: env.WORKER_CONCURRENCY,
    });

    try {
      await this.transporter.verify();
      logger.info('Ethereal SMTP transport verified and ready for outbound sending');
      this.isInitialized = true;
    } catch (err: any) {
      logger.warn('SMTP transporter verification failed', { error: err.message });
    }

    return this.transporter;
  }

  async sendEmail(options: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<SmtpSendResult> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: `"ReachInbox Campaign" <${options.from}>`,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <p>${options.body.replace(/\n/g, '<br/>')}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <small style="color: #999;">Sent via ReachInbox Outbound Scheduler</small>
             </div>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info('Email dispatched via SMTP', {
      to: options.to,
      messageId: info.messageId,
      previewUrl: previewUrl || 'N/A',
    });

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }
}

export const smtpService = new SmtpService();
