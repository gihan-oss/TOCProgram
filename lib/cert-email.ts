// Congratulations / cohort-completion email. The certificate travels as email
// ATTACHMENTS (PNG image + PDF), so nothing needs to be hosted. Only the
// required Cohort 5 feedback form is a link.

export const COHORT_LABEL = "Cohort 5";

// The real TOC Cohort 5 feedback form.
export const FEEDBACK_URL = "https://discovery.amalandco.com/r/Gx418O";

export function buildCertEmail(firstName: string, feedbackUrl: string = FEEDBACK_URL) {
  const name = (firstName || "there").trim();
  const subject = `You did it, ${name} — your MAS GLA certificate is here`;
  const confettiColors = ["#5BB947", "#1C4E9B", "#C9A54A", "#7BC960", "#2E9CCA", "#4a9e37"];
  const confetti = Array.from({ length: 24 }, (_, i) =>
    `<td height="8" style="background:${confettiColors[i % confettiColors.length]};font-size:0;line-height:0;">&nbsp;</td>`).join("");
  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef1;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:26px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;">
    <!-- confetti strip -->
    <tr><td style="padding:0;font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${confetti}</tr></table>
    </td></tr>

    <!-- hero -->
    <tr><td style="background:#0F2A4F;padding:44px 44px 40px;text-align:center;">
      <span style="display:inline-block;background:#5BB947;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:2.5px;padding:7px 16px;border-radius:20px;">${COHORT_LABEL.toUpperCase()} GRADUATE</span>
      <div style="color:#ffffff;font-size:40px;line-height:1.06;font-weight:800;letter-spacing:-0.6px;margin-top:20px;">
        You did it,<br><span style="color:#7BC960;">${name}.</span>
      </div>
      <p style="color:#c9d6e8;font-size:16px;line-height:1.6;margin:18px auto 0;max-width:430px;">
        You've completed <b style="color:#ffffff;">all five modules</b> of the MAS GLA Theory of Change &mdash; ${COHORT_LABEL}. That's a real achievement, and we're proud to call you a graduate of the program.
      </p>
    </td></tr>

    <!-- certificate -->
    <tr><td style="padding:34px 44px 0;text-align:center;">
      <div style="color:#1C4E9B;font-size:12px;font-weight:800;letter-spacing:3px;">YOUR CERTIFICATE</div>
      <div style="color:#14171c;font-size:24px;font-weight:800;letter-spacing:-0.2px;margin-top:8px;">Earned, and yours to keep.</div>
      <p style="color:#4b5563;font-size:15.5px;line-height:1.6;margin:10px auto 0;max-width:440px;">It's attached to this email as an <b>image</b> and a <b>PDF</b> &mdash; download it, print it, and share it proudly.</p>
    </td></tr>

    <!-- required step -->
    <tr><td style="padding:30px 44px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f8ee;border-left:5px solid #5BB947;">
        <tr><td style="padding:24px 26px;">
          <div style="color:#4a9e37;font-size:12px;font-weight:800;letter-spacing:2px;">ONE FINAL STEP</div>
          <div style="color:#14171c;font-size:21px;font-weight:800;margin-top:8px;">Make it official.</div>
          <p style="color:#42504a;font-size:15px;line-height:1.6;margin:10px 0 18px;">
            You're almost there. Complete the quick <b>${COHORT_LABEL} form</b> &mdash; it takes about two minutes and it's the final step to be formally recognized as a graduate of the cohort.
          </p>
          <a href="${feedbackUrl}" style="display:inline-block;background:#5BB947;color:#ffffff;font-size:15px;font-weight:800;letter-spacing:0.4px;padding:14px 34px;text-decoration:none;">COMPLETE THE FORM &nbsp;&rarr;</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- close -->
    <tr><td style="padding:32px 44px 12px;color:#2b2b2b;font-size:15.5px;line-height:1.65;">
      <p style="margin:0 0 14px;">Thank you for the commitment you brought to every module. This isn't the finish line &mdash; it's your launchpad for the work ahead.</p>
      <p style="margin:0;">With pride,<br><b>The MAS GLA Team</b><br><span style="color:#8a8a8a;font-size:13px;">in partnership with Amal &amp; Company</span></p>
    </td></tr>
    <tr><td style="background:#0b1f3a;padding:18px 44px;color:#7f93ad;font-size:12px;line-height:1.6;">
      MAS Greater Los Angeles &middot; Theory of Change Program<br>Questions? Just reply to this email.
    </td></tr>
  </table>
</td></tr>
</table>`;
  return { subject, html };
}
