const nodemailer = require('nodemailer');
const twilio = require('twilio');

/**
 * NotificationService
 * Sends email + SMS alerts to the family/contact of a missing person
 * when a match involving that person is verified.
 *
 * Configuration (set these in your environment, e.g. Render dashboard):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 * If a channel's credentials aren't set, that channel is skipped with a
 * warning instead of throwing — so missing config on one channel never
 * breaks the whole app.
 */
class NotificationService {
    constructor() {
        this.emailEnabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        this.smsEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

        if (this.emailEnabled) {
            this.mailer = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        } else {
            console.warn('[notification.service] Email not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS) — email notifications are disabled.');
        }

        if (this.smsEnabled) {
            this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        } else {
            console.warn('[notification.service] SMS not configured (missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER) — SMS notifications are disabled.');
        }
    }

    /**
     * Notify a missing person's contact that a match has been verified.
     * @param {Object} missingPerson - populated MissingPerson doc (needs contactInfo, fullName)
     * @param {Object} match - the Match doc (needs similarityScore, _id)
     * @returns {Promise<{emailSent: boolean, smsSent: boolean, errors: string[]}>}
     */
    async notifyFamilyOfMatch(missingPerson, match) {
        const result = { emailSent: false, smsSent: false, errors: [] };
        const contact = missingPerson.contactInfo || {};

        const subject = `Possible match found for ${missingPerson.fullName}`;
        const messageBody =
            `Hello ${contact.name || ''},\n\n` +
            `A potential match has been verified for ${missingPerson.fullName} ` +
            `(similarity score: ${match.similarityScore}%).\n\n` +
            `Please log in to the platform or contact the coordinating team as soon as possible ` +
            `to review the details and next steps.\n\n` +
            `Match reference: ${match._id}`;

        // Email
        if (this.emailEnabled && contact.email) {
            try {
                await this.mailer.sendMail({
                    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                    to: contact.email,
                    subject,
                    text: messageBody
                });
                result.emailSent = true;
            } catch (err) {
                console.error('[notification.service] Failed to send email:', err.message);
                result.errors.push(`email: ${err.message}`);
            }
        }

        // SMS
        if (this.smsEnabled && contact.phone) {
            try {
                await this.twilioClient.messages.create({
                    body: `${subject}. Similarity: ${match.similarityScore}%. Please check the platform for details. Ref: ${match._id}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: contact.phone
                });
                result.smsSent = true;
            } catch (err) {
                console.error('[notification.service] Failed to send SMS:', err.message);
                result.errors.push(`sms: ${err.message}`);
            }
        }

        return result;
    }
}

module.exports = new NotificationService();
