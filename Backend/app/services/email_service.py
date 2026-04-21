import logging
import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


def _html_body(first_name: str, verify_url: str) -> str:
    return f"""\
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:'Poppins',Arial,sans-serif;background:#f4f6fb;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:16px;
                      box-shadow:0 4px 24px rgba(44,62,107,.12);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1e2d52;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:.5px;">
                HearMeRead
              </h1>
              <p style="margin:6px 0 0;color:#9099b8;font-size:13px;">
                Automated Oral Reading Assessment
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1a2340;">
                Hi <strong>{first_name}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.6;">
                Welcome to HearMeRead! Click the button below to verify your
                email address and activate your account.
              </p>
              <div style="text-align:center;margin-bottom:28px;">
                <a href="{verify_url}"
                   style="display:inline-block;padding:13px 36px;
                          background:#2c7fc1;color:#fff;border-radius:8px;
                          text-decoration:none;font-size:14px;font-weight:600;
                          letter-spacing:.3px;">
                  Verify Email Address
                </a>
              </div>
              <p style="margin:0 0 6px;font-size:12px;color:#8a94b2;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:11px;color:#4a6fa5;word-break:break-all;">
                {verify_url}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fc;padding:20px 40px;
                       border-top:1px solid #e8eaf2;text-align:center;">
              <p style="margin:0;font-size:11.5px;color:#b0b8d0;line-height:1.6;">
                This link expires in <strong>24 hours</strong>.<br>
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _text_body(first_name: str, verify_url: str) -> str:
    return f"""\
Hi {first_name},

Welcome to HearMeRead! Please verify your email address by visiting:

{verify_url}

This link expires in 24 hours.

If you did not create this account, you can safely ignore this email.

— The HearMeRead Team
"""


async def send_verification_email(
    to_email: str,
    first_name: str,
    token: str,
) -> None:
   
    # Set API key on every call — safe and stateless
    resend.api_key = settings.RESEND_API_KEY

    verify_url = (
        f"{settings.BACKEND_URL}/routes/auth/verify?token={token}"
    )

    from_address = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"

    params: resend.Emails.SendParams = {
        "from":    from_address,
        "to":      [to_email],
        "subject": "Verify your HearMeRead account",
        "html":    _html_body(first_name, verify_url),
        "text":    _text_body(first_name, verify_url),
    }

    try:
        response = resend.Emails.send(params)
        logger.info(
            f"Verification email sent to {to_email} | "
            f"Resend ID: {response.get('id', 'unknown')}"
        )
    except Exception as exc:
        logger.error(f"Resend failed for {to_email}: {exc}")
        raise RuntimeError(
            "Could not send verification email. Please try again later."
        ) from exc
