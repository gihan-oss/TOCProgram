// Congratulations / cohort-completion email. The certificate travels as email
// ATTACHMENTS (PNG image + PDF), so nothing needs to be hosted. Only the
// required Cohort 5 feedback form is a link.

export const COHORT_LABEL = "Cohort 5";

// TODO: swap for the real TOC Cohort 5 feedback form when provided.
export const FEEDBACK_URL = "https://discovery.amalandco.com/r/0QyM4Q";

export function buildCertEmail(firstName: string, feedbackUrl: string = FEEDBACK_URL) {
  const name = (firstName || "there").trim();
  const subject = `Your MAS GLA Theory of Change Certificate — ${COHORT_LABEL}`;
  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef1;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:26px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;">
    <tr><td style="background:#0F2A4F;padding:42px 44px 38px;">
      <div style="color:#8ED07A;font-size:12px;font-weight:700;letter-spacing:3px;">MAS GLA &middot; THEORY OF CHANGE</div>
      <div style="color:#ffffff;font-size:34px;line-height:1.12;font-weight:800;letter-spacing:-0.4px;margin-top:14px;">
        Congratulations,<br><span style="color:#7BC960;">${name}.</span>
      </div>
      <p style="color:#c9d6e8;font-size:15.5px;line-height:1.6;margin:16px 0 0;max-width:440px;">
        You've completed <b style="color:#ffffff;">all five modules</b> of the MAS GLA Theory of Change &mdash; ${COHORT_LABEL}. This is a real milestone: you've moved from learning to the tools that turn strategy into measurable impact.
      </p>
    </td></tr>
    <tr><td style="padding:30px 44px 0;color:#2b2b2b;font-size:15.5px;line-height:1.65;">
      <p style="margin:0 0 6px;font-weight:700;color:#1C4E9B;font-size:12px;letter-spacing:2px;">YOUR CERTIFICATE</p>
      <p style="margin:0;">It's attached to this email as an <b>image (PNG)</b> and a <b>PDF</b> &mdash; yours to download, print, and share.</p>
    </td></tr>
    <tr><td style="padding:26px 44px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f8ee;border-left:4px solid #5BB947;">
        <tr><td style="padding:22px 24px;">
          <div style="color:#4a9e37;font-size:12px;font-weight:700;letter-spacing:2px;">ONE FINAL STEP &mdash; REQUIRED</div>
          <div style="color:#14171c;font-size:19px;font-weight:800;margin-top:8px;">Complete the TOC ${COHORT_LABEL} form.</div>
          <p style="color:#42504a;font-size:14.5px;line-height:1.6;margin:10px 0 16px;">
            Your certificate is issued &mdash; but the cohort isn't officially complete until you submit the ${COHORT_LABEL} feedback form. It's <b>non-negotiable</b> and takes just a few minutes. This is the final step to be formally recognized as a graduate of the program.
          </p>
          <a href="${feedbackUrl}" style="display:inline-block;background:#5BB947;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.4px;padding:13px 28px;text-decoration:none;">COMPLETE THE FORM &nbsp;&rarr;</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:28px 44px 8px;color:#2b2b2b;font-size:15px;line-height:1.65;">
      <p style="margin:0 0 14px;">Thank you for the commitment you brought to every module. What you've learned doesn't stop here &mdash; it's the foundation for the work ahead.</p>
      <p style="margin:0;">With gratitude,<br><b>The MAS GLA Team</b><br><span style="color:#8a8a8a;font-size:13px;">in partnership with Amal &amp; Company</span></p>
    </td></tr>
    <tr><td style="background:#0b1f3a;padding:18px 44px;color:#7f93ad;font-size:12px;line-height:1.6;">
      MAS Greater Los Angeles &middot; Theory of Change Program<br>Questions? Just reply to this email.
    </td></tr>
  </table>
</td></tr>
</table>`;
  return { subject, html };
}
