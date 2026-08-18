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
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
  body{margin:0;padding:0;}
  .wrap{width:100%;background:#eceef1;}
  a{text-decoration:none;}
  @media only screen and (max-width:620px){
    .px{padding-left:26px !important;padding-right:26px !important;}
    .h1{font-size:30px !important;line-height:1.12 !important;}
    .h2{font-size:22px !important;}
  }
</style>
<table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef1;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:26px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;">

    <!-- confetti strip -->
    <tr><td style="padding:0;font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${confetti}</tr></table>
    </td></tr>

    <!-- HERO -->
    <tr><td class="px" style="background:#0F2A4F;padding:46px 44px 42px;">
      <div style="color:#8ED07A;font-size:12px;font-weight:700;letter-spacing:3px;">MAS GLA &middot; THEORY OF CHANGE</div>
      <div style="margin-top:16px;"><span style="display:inline-block;background:#5BB947;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:2.5px;padding:7px 15px;">${COHORT_LABEL.toUpperCase()} GRADUATE</span></div>
      <div class="h1" style="color:#ffffff;font-size:40px;line-height:1.06;font-weight:800;letter-spacing:-0.6px;margin-top:20px;">
        You did it,<br><span style="color:#7BC960;">${name}.</span>
      </div>
      <p style="color:#c9d6e8;font-size:15px;line-height:1.6;margin:20px 0 0;max-width:430px;">
        You've completed <b style="color:#ffffff;">all five modules</b> of the MAS GLA Theory of Change &mdash; ${COHORT_LABEL}. That's a real achievement, and we're proud to call you a graduate of the program.
      </p>
    </td></tr>

    <!-- YOUR CERTIFICATE -->
    <tr><td class="px" style="padding:44px 44px 0;">
      <div style="color:#5BB947;font-size:12px;font-weight:700;letter-spacing:3px;">YOUR CERTIFICATE</div>
      <div class="h2" style="color:#14171c;font-size:26px;font-weight:800;letter-spacing:-0.3px;margin-top:12px;">Earned, and yours to keep.</div>
      <p style="color:#4b5563;font-size:15.5px;line-height:1.65;margin:14px 0 0;">
        It's attached to this email as an <b>image</b> and a <b>PDF</b> &mdash; download it, print it, and share it proudly. You earned every bit of it.
      </p>
    </td></tr>

    <tr><td class="px" style="padding:32px 44px 0;"><div style="border-top:1px solid #e6e8ec;font-size:0;line-height:0;">&nbsp;</div></td></tr>

    <!-- ONE FINAL STEP (navy CTA block) -->
    <tr><td class="px" style="background:#0F2A4F;padding:0;"></td></tr>
    <tr><td class="px" style="background:#0F2A4F;padding:40px 44px 44px;">
      <div style="color:#8ED07A;font-size:12px;font-weight:700;letter-spacing:3px;">ONE FINAL STEP</div>
      <div class="h1" style="color:#ffffff;font-size:32px;line-height:1.12;font-weight:800;letter-spacing:-0.4px;margin-top:12px;">Make it official.</div>
      <p style="color:#c9d6e8;font-size:15px;line-height:1.6;margin:14px 0 26px;max-width:430px;">
        Complete the quick <b style="color:#ffffff;">${COHORT_LABEL} form</b> &mdash; about two minutes, and it's the final step to be formally recognized as a graduate of the cohort.
      </p>
      <a href="${feedbackUrl}" style="display:inline-block;background:#5BB947;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.6px;padding:15px 34px;">COMPLETE THE FORM &nbsp;&rarr;</a>
    </td></tr>

    <!-- CLOSE -->
    <tr><td class="px" style="padding:36px 44px 10px;color:#2b2b2b;font-size:15.5px;line-height:1.65;">
      <p style="margin:0 0 14px;">Thank you for the commitment you brought to every module. This isn't the finish line &mdash; it's your launchpad for the work ahead.</p>
      <p style="margin:0;">With pride,<br><b>The MAS GLA Team</b><br><span style="color:#8a8a8a;font-size:13px;">in partnership with Amal &amp; Company</span></p>
    </td></tr>
    <tr><td class="px" style="background:#0b1f3a;padding:18px 44px;color:#7f93ad;font-size:12px;line-height:1.6;">
      MAS Greater Los Angeles &middot; Theory of Change Program<br>Questions? Just reply to this email.
    </td></tr>
  </table>
</td></tr>
</table>`;
  return { subject, html };
}
