import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private buildTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 0);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) return null;
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendPasswordResetEmail(params: { to: string; resetLink: string }) {
    const from = process.env.SMTP_FROM;
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const transport = this.buildTransport();

    if (!transport || !from) {
      if ((process.env.NODE_ENV ?? 'development') !== 'production') {
        this.logger.log(`SMTP 未配置，开发环境请手动使用重置链接: ${params.resetLink}`);
      } else {
        this.logger.warn('SMTP 未配置，生产环境将无法发送重置邮件');
      }
      return;
    }

    await transport.sendMail({
      from,
      to: params.to,
      subject: '重置密码',
      text: `你正在重置密码。请在 30 分钟内访问以下链接完成操作：${params.resetLink}\n\n如果不是你本人操作，请忽略本邮件。\n\n${appUrl}`,
      html: `<p>你正在重置密码。请在 <b>30 分钟</b> 内点击以下链接完成操作：</p><p><a href="${params.resetLink}">${params.resetLink}</a></p><p>如果不是你本人操作，请忽略本邮件。</p>`,
    });
  }
}
