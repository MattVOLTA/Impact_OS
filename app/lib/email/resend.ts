/**
 * Resend Email Service
 *
 * Handles sending emails via Resend API
 * Part of Issue #54: Self-Service Onboarding - Phase 5
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Send organization invitation email
 */
export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  role,
  inviteToken
}: {
  to: string
  organizationName: string
  inviterName: string
  role: string
  inviteToken: string
}) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite/${inviteToken}`

  try {
    const { data, error } = await resend.emails.send({
      from: 'impact OS <onboarding@impactos.xyz>',
      to,
      subject: `You've been invited to join ${organizationName} on impact OS`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 32px; margin-bottom: 24px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #111827;">
                You've been invited to join ${organizationName}
              </h1>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 16px;">
                ${inviterName} has invited you to join their organization on impact OS as a <strong>${role}</strong>.
              </p>
            </div>

            <div style="margin-bottom: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px;">
                impact OS helps accelerators and incubators track their portfolio companies and comply with government reporting requirements.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px;">
                Click the button below to accept your invitation:
              </p>

              <div style="text-align: center;">
                <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
              </p>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                This invitation was sent to ${to}. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
                This invitation link will expire in 7 days.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Email sending error:', error)
    throw error
  }
}
