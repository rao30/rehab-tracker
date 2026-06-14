import { Resend } from "resend";
import { format } from "date-fns";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || "RenovateFlow <onboarding@resend.dev>";

export type ContractorInviteEmailParams = {
  to: string;
  projectName: string;
  ownerName: string;
  inviteUrl: string;
  expiresAt: Date;
};

function buildContractorInviteHtml({
  projectName,
  ownerName,
  inviteUrl,
  expiresAt,
}: Omit<ContractorInviteEmailParams, "to">) {
  const expiryLabel = format(expiresAt, "MMMM d, yyyy");

  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 22px; margin-bottom: 8px;">You're invited to a renovation project</h1>
    <p style="margin-top: 0;">
      <strong>${ownerName}</strong> invited you to join <strong>${projectName}</strong> on RenovateFlow as the contractor.
    </p>
    <p>
      Accept the invite to submit draw requests, upload progress photos, and track milestone payments.
    </p>
    <p style="margin: 32px 0;">
      <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
        Accept invite
      </a>
    </p>
    <p style="font-size: 14px; color: #64748b;">
      This invite expires on ${expiryLabel}. If you already have a RenovateFlow account as a property owner, sign in with that same email when accepting.
    </p>
    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
      Or copy this link: ${inviteUrl}
    </p>
  </body>
</html>
  `.trim();
}

function buildContractorInviteText({
  projectName,
  ownerName,
  inviteUrl,
  expiresAt,
}: Omit<ContractorInviteEmailParams, "to">) {
  const expiryLabel = format(expiresAt, "MMMM d, yyyy");

  return [
    `${ownerName} invited you to join ${projectName} on RenovateFlow as the contractor.`,
    "",
    "Accept the invite to submit draw requests, upload progress photos, and track milestone payments.",
    "",
    `Accept invite: ${inviteUrl}`,
    "",
    `This invite expires on ${expiryLabel}.`,
    "If you already have a RenovateFlow account as a property owner, sign in with that same email when accepting.",
  ].join("\n");
}

export async function sendContractorInviteEmail(
  params: ContractorInviteEmailParams
): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — contractor invite email not sent:",
      params.inviteUrl
    );
    return { sent: false, error: "Email service not configured" };
  }

  const { to, ...content } = params;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `You're invited to ${params.projectName} on RenovateFlow`,
    html: buildContractorInviteHtml(content),
    text: buildContractorInviteText(content),
  });

  if (error) {
    console.error("[email] Failed to send contractor invite:", error);
    return { sent: false, error: error.message };
  }

  return { sent: true };
}
