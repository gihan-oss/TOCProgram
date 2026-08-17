// Congratulations / cohort-completion email. The certificate travels as email
// ATTACHMENTS (PNG image + PDF), so nothing needs to be hosted. Only the
// required Cohort 5 feedback form is a link.

export const COHORT_LABEL = "Cohort 5";

// The real TOC Cohort 5 feedback form.
export const FEEDBACK_URL = "https://discovery.amalandco.com/r/Gx418O";

export function buildCertEmail(firstName: string, feedbackUrl: string = FEEDBACK_URL) {
  const name = (firstName || "there").trim();
  const subject = `🎉 You did it, ${name}! Your MAS GLA certificate is here`;
  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef1;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:26px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;">
    <!-- celebratory hero -->
    <tr><td style="background:#0F2A4F;padding:40px 44px 36px;text-align:center;">
      <div style="font-size:40px;line-height:1;letter-spacing:6px;">🎉&nbsp;🎊&nbsp;🥳&nbsp;✨&nbsp;🎈</div>
      <div style="color:#7BC960;font-size:13px;font-weight:800;letter-spacing:4px;margin-top:18px;">YOU DID IT</div>
      <div style="color:#ffffff;font-size:38px;line-height:1.08;font-weight:800;letter-spacing:-0.5px;margin-top:8px;">
        WOOHOO,<br><span style="color:#7BC960;">${name}! 🙌</span>
      </div>
      <p style="color:#c9d6e8;font-size:16px;line-height:1.6;margin:16px auto 0;max-width:430px;">
        You just completed <b style="color:#ffffff;">all five modules</b> of the MAS GLA Theory of Change &mdash; ${COHORT_LABEL}. That is a <b style="color:#ffffff;">huge</b> deal, and we are so proud of you. 🎓
      </p>
    </td></tr>

    <!-- certificate -->
    <tr><td style="padding:30px 44px 0;color:#2b2b2b;font-size:16px;line-height:1.65;text-align:center;">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#1C4E9B;">🎓 YOUR CERTIFICATE</div>
      <p style="margin:8px 0 0;">It's <b>attached to this email</b> as an image and a PDF &mdash; go on, download it, print it, frame it, brag a little. You earned every bit of it! ✨</p>
    </td></tr>

    <!-- one last step (friendly but required) -->
    <tr><td style="padding:28px 44px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f8ee;border:2px dashed #5BB947;border-radius:10px;">
        <tr><td style="padding:22px 24px;text-align:center;">
          <div style="font-size:26px;">🎈</div>
          <div style="color:#4a9e37;font-size:12px;font-weight:800;letter-spacing:2px;margin-top:4px;">ONE TINY LAST STEP</div>
          <div style="color:#14171c;font-size:20px;font-weight:800;margin-top:6px;">Make it official! 🎯</div>
          <p style="color:#42504a;font-size:15px;line-height:1.6;margin:10px auto 16px;max-width:420px;">
            You're <i>this</i> close! Just fill out the quick <b>${COHORT_LABEL} form</b> &mdash; it takes about 2 minutes and it's the final checkbox to officially graduate the cohort. Pinky promise it's painless. 💚
          </p>
          <a href="${feedbackUrl}" style="display:inline-block;background:#5BB947;color:#ffffff;font-size:15px;font-weight:800;letter-spacing:0.4px;padding:14px 32px;border-radius:8px;text-decoration:none;">🎉 &nbsp;COMPLETE THE FORM &nbsp;&rarr;</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- close -->
    <tr><td style="padding:30px 44px 10px;color:#2b2b2b;font-size:15.5px;line-height:1.65;text-align:center;">
      <p style="margin:0 0 14px;">Thank you for the heart you brought to every single module. This isn't the finish line &mdash; it's your launchpad. Now go celebrate. You've absolutely earned it. 🥳</p>
      <p style="margin:0;">With so much pride,<br><b>The MAS GLA Team</b> 💙<br><span style="color:#8a8a8a;font-size:13px;">in partnership with Amal &amp; Company</span></p>
    </td></tr>
    <tr><td style="background:#0b1f3a;padding:18px 44px;color:#7f93ad;font-size:12px;line-height:1.6;text-align:center;">
      MAS Greater Los Angeles &middot; Theory of Change Program<br>Questions? Just reply to this email &mdash; we'd love to hear from you.
    </td></tr>
  </table>
</td></tr>
</table>`;
  return { subject, html };
}
