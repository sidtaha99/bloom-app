import { config } from '../config';

export interface EmailSendResult {
  sent: boolean;
  provider: string;
  reason?: string;
  messageId?: string;
}

export interface EmailMessagePayload {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface IEmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(payload: EmailMessagePayload): Promise<EmailSendResult>;
}

class BrevoEmailProvider implements IEmailProvider {
  readonly name = 'brevo';

  isConfigured(): boolean {
    return Boolean(config.brevoApiKey && config.emailFrom);
  }

  async send(payload: EmailMessagePayload): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return {
        sent: false,
        provider: this.name,
        reason:
          'Brevo email credentials (BREVO_API_KEY and EMAIL_FROM) are not configured in environment variables.',
      };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': config.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: config.emailFromName || 'Bloom',
            email: config.emailFrom,
          },
          to: [
            {
              email: payload.toEmail,
              name: payload.toName,
            },
          ],
          subject: payload.subject,
          htmlContent: payload.htmlContent,
          textContent: payload.textContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          sent: false,
          provider: this.name,
          reason: `Brevo API error (${response.status}): ${errorText.slice(0, 200)}`,
        };
      }

      const data = (await response.json()) as { messageId?: string };
      return {
        sent: true,
        provider: this.name,
        messageId: data.messageId,
      };
    } catch (err) {
      return {
        sent: false,
        provider: this.name,
        reason: err instanceof Error ? err.message : 'Network error sending Brevo email',
      };
    }
  }
}

function getActiveProvider(): IEmailProvider {
  // Provider-swappable factory
  switch (config.emailProvider) {
    case 'brevo':
    default:
      return new BrevoEmailProvider();
  }
}

export const emailService = {
  isConfigured(): boolean {
    return getActiveProvider().isConfigured();
  },

  async sendVerificationOtp(toEmail: string, toName: string, otpCode: string): Promise<EmailSendResult> {
    const provider = getActiveProvider();
    return provider.send({
      toEmail,
      toName,
      subject: 'Your Bloom verification code',
      textContent: `Hello ${toName},\n\nYour Bloom email verification code is: ${otpCode}\nThis code expires in 15 minutes.\n\nIf you did not create a Bloom account, you can safely ignore this message.`,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FAF8F6; color: #2B2328; border-radius: 16px;">
          <h2 style="margin: 0 0 12px; color: #9D4E63;">Welcome to Bloom</h2>
          <p style="line-height: 1.6; margin: 0 0 20px;">Hello ${escapeHtml(toName)}, please use the verification code below to confirm your email address:</p>
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 16px 24px; background: #FFFFFF; border: 1px solid #E6DFD7; border-radius: 12px; text-align: center; color: #2B2328;">
            ${escapeHtml(otpCode)}
          </div>
          <p style="font-size: 13px; color: #6E5D66; margin-top: 20px;">This code expires in 15 minutes and allows up to 5 verification attempts.</p>
        </div>
      `,
    });
  },

  async sendPasswordResetOtp(toEmail: string, toName: string, otpCode: string): Promise<EmailSendResult> {
    const provider = getActiveProvider();
    return provider.send({
      toEmail,
      toName,
      subject: 'Bloom password reset code',
      textContent: `Hello ${toName},\n\nYour Bloom password reset code is: ${otpCode}\nThis code expires in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FAF8F6; color: #2B2328; border-radius: 16px;">
          <h2 style="margin: 0 0 12px; color: #9D4E63;">Password Reset Request</h2>
          <p style="line-height: 1.6; margin: 0 0 20px;">Hello ${escapeHtml(toName)}, enter the code below to set a new password for your Bloom account:</p>
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 16px 24px; background: #FFFFFF; border: 1px solid #E6DFD7; border-radius: 12px; text-align: center; color: #2B2328;">
            ${escapeHtml(otpCode)}
          </div>
          <p style="font-size: 13px; color: #6E5D66; margin-top: 20px;">This code expires in 15 minutes. If you did not request this, your password has not been changed.</p>
        </div>
      `,
    });
  },

  async sendSecurityAlert(toEmail: string, toName: string, eventMessage: string): Promise<EmailSendResult> {
    const provider = getActiveProvider();
    return provider.send({
      toEmail,
      toName,
      subject: 'Bloom account security notice',
      textContent: `Hello ${toName},\n\n${eventMessage}\n\nIf this wasn't you, please reset your password immediately.`,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FAF8F6; color: #2B2328; border-radius: 16px;">
          <h2 style="margin: 0 0 12px; color: #9D4E63;">Security Notification</h2>
          <p style="line-height: 1.6;">Hello ${escapeHtml(toName)},</p>
          <p style="line-height: 1.6;">${escapeHtml(eventMessage)}</p>
          <p style="font-size: 13px; color: #6E5D66; margin-top: 20px;">If you did not initiate this change, please reset your password immediately.</p>
        </div>
      `,
    });
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
