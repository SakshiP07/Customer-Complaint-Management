import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const host = env.EMAIL_HOST ? env.EMAIL_HOST.replace("imap", "smtp") : "smtp.gmail.com";

const transporter = nodemailer.createTransport({
  host,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_PORT === 465,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string, replyToMessageId?: string) => {
  if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) {
    logger.warn("Email credentials not set. Skipping email send.");
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM || env.EMAIL_USER,
      to,
      subject,
      text,
      html,
      inReplyTo: replyToMessageId,
      references: replyToMessageId ? [replyToMessageId] : undefined,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    const err = error instanceof Error ? { message: error.message } : { error: String(error) };
    logger.error(`Error sending email to ${to}:`, err);
    // Don't throw to avoid crashing the caller
  }
};
