"""Shared email template components for Ruthva transactional emails.

Sentry-inspired design: bold typography, strong visual hierarchy,
solid gray background with white content card, emerald brand palette.
"""

import html as html_mod

# ---------------------------------------------------------------------------
# Design tokens (inline CSS values)
# ---------------------------------------------------------------------------
_BG = "#f4f4f5"           # zinc-100  – page background
_CARD = "#ffffff"          # white     – content card
_PRIMARY = "#047857"       # emerald-700 – CTA, links, emphasis
_TEXT = "#18181b"          # zinc-900  – headings
_TEXT_BODY = "#3f3f46"     # zinc-700  – body text
_TEXT_MUTED = "#a1a1aa"    # zinc-400  – footer, captions
_BORDER = "#e4e4e7"       # zinc-200  – card border, dividers
_DATA_BG = "#f4f4f5"      # zinc-100  – structured data card
_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

# Ruthva logo – hosted publicly so email clients can render it.
# Update this URL once the logo is deployed to S3/CDN.
RUTHVA_LOGO_URL = "https://ruthva.com/logo.png"


def email_header(topic: str) -> str:
    """Ruthva logo + horizontal divider + topic label."""
    safe_topic = html_mod.escape(topic)
    return f"""\
<tr>
  <td style="padding: 32px 40px 0;">
    <img src="{RUTHVA_LOGO_URL}" alt="Ruthva" height="28"
         style="display: block; height: 28px; width: auto;" />
  </td>
</tr>
<tr>
  <td style="padding: 16px 40px 0;">
    <hr style="border: none; border-top: 1px solid {_BORDER}; margin: 0;" />
  </td>
</tr>
<tr>
  <td style="padding: 16px 40px 0;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 12px;
       font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
       color: {_TEXT_MUTED};">
      {safe_topic}
    </p>
  </td>
</tr>"""


def email_footer(clinic_name: str = "", doctor_name: str = "") -> str:
    """Optional clinic signature + 'Sent by Ruthva' muted footer."""
    signature = ""
    if doctor_name or clinic_name:
        parts = []
        if doctor_name:
            parts.append(
                f'<strong style="color: {_TEXT};">'
                f"{html_mod.escape(doctor_name)}</strong>"
            )
        if clinic_name:
            parts.append(html_mod.escape(clinic_name))
        signature = f"""\
<tr>
  <td style="padding: 24px 40px 0;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 15px;
       line-height: 1.6; color: {_TEXT_BODY};">
      Warm regards,<br>{'<br>'.join(parts)}
    </p>
  </td>
</tr>"""

    return f"""\
{signature}
<tr>
  <td style="padding: 32px 40px 0;">
    <hr style="border: none; border-top: 1px solid {_BORDER}; margin: 0;" />
  </td>
</tr>
<tr>
  <td style="padding: 16px 40px 32px;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 12px;
       color: {_TEXT_MUTED}; text-align: center;">
      Sent by Ruthva
    </p>
  </td>
</tr>"""


def email_button(text: str, url: str) -> str:
    """Solid emerald CTA button with strong contrast."""
    safe_text = html_mod.escape(text)
    safe_url = html_mod.escape(url)
    return f"""\
<tr>
  <td style="padding: 28px 40px 0;" align="center">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{safe_url}"
      style="height:48px;v-text-anchor:middle;width:220px;" arcsize="12%"
      strokecolor="{_PRIMARY}" fillcolor="{_PRIMARY}">
    <center style="color:#ffffff;font-family:{_FONT};font-size:16px;font-weight:600;">
      {safe_text}
    </center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="{safe_url}"
       style="display: inline-block; background-color: {_PRIMARY}; color: #ffffff;
              font-family: {_FONT}; font-size: 16px; font-weight: 600;
              text-decoration: none; padding: 12px 32px; border-radius: 6px;
              mso-hide: all;">
      {safe_text}
    </a>
    <!--<![endif]-->
  </td>
</tr>"""


def email_data_row(label: str, value: str) -> str:
    """Single key-value row for use inside email_data_card."""
    safe_label = html_mod.escape(label)
    safe_value = html_mod.escape(value)
    return f"""\
<tr>
  <td style="padding: 4px 0; font-family: {_FONT}; font-size: 14px;
     color: {_TEXT_MUTED}; width: 120px; vertical-align: top;">
    {safe_label}
  </td>
  <td style="padding: 4px 0; font-family: {_FONT}; font-size: 14px;
     color: {_TEXT}; vertical-align: top;">
    {safe_value}
  </td>
</tr>"""


def email_data_card(rows: list[tuple[str, str]], title: str = "") -> str:
    """Card with structured key-value data and optional title."""
    title_html = ""
    if title:
        safe_title = html_mod.escape(title)
        title_html = (
            f'<p style="margin: 0 0 12px; font-family: {_FONT}; font-size: 12px;'
            f' font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;'
            f' color: {_TEXT_MUTED};">{safe_title}</p>'
        )

    rows_html = "\n".join(email_data_row(label, value) for label, value in rows)

    return f"""\
<tr>
  <td style="padding: 20px 40px 0;">
    <div style="background-color: {_DATA_BG}; border-radius: 8px; padding: 20px;">
      {title_html}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        {rows_html}
      </table>
    </div>
  </td>
</tr>"""


def email_text(text: str) -> str:
    """Standard body text paragraph."""
    return f"""\
<tr>
  <td style="padding: 16px 40px 0;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 15px;
       line-height: 1.6; color: {_TEXT_BODY};">
      {text}
    </p>
  </td>
</tr>"""


def email_heading(text: str) -> str:
    """Large heading for primary message."""
    safe_text = html_mod.escape(text)
    return f"""\
<tr>
  <td style="padding: 20px 40px 0;">
    <h1 style="margin: 0; font-family: {_FONT}; font-size: 24px;
       font-weight: 700; color: {_TEXT};">
      {safe_text}
    </h1>
  </td>
</tr>"""


def email_code(code: str) -> str:
    """Large monospace code display (for OTP codes)."""
    safe_code = html_mod.escape(code)
    return f"""\
<tr>
  <td style="padding: 24px 40px 0;" align="center">
    <div style="background-color: {_DATA_BG}; border-radius: 8px;
         padding: 24px; display: inline-block;">
      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono',
         Menlo, monospace; font-size: 36px; font-weight: 700;
         letter-spacing: 8px; color: {_TEXT};">
        {safe_code}
      </span>
    </div>
  </td>
</tr>"""


def email_muted_text(text: str) -> str:
    """Small muted text for secondary information."""
    return f"""\
<tr>
  <td style="padding: 12px 40px 0;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 13px;
       line-height: 1.5; color: {_TEXT_MUTED};">
      {text}
    </p>
  </td>
</tr>"""


def email_fallback_link(url: str) -> str:
    """Muted copy-paste link for when buttons don't work."""
    safe_url = html_mod.escape(url)
    return f"""\
<tr>
  <td style="padding: 16px 40px 0;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 13px;
       color: {_TEXT_MUTED}; text-align: center;">
      If the button doesn't work, copy this link:<br>
      <a href="{safe_url}" style="color: {_PRIMARY}; word-break: break-all;">
        {safe_url}
      </a>
    </p>
  </td>
</tr>"""


def email_wrapper(content: str, preview_text: str = "") -> str:
    """Full HTML document with gray background, white card, responsive wrapper.

    ``content`` should be a sequence of <tr>…</tr> rows produced by the
    component helpers above.
    """
    # Hidden preview text trick: rendered in inbox but invisible in email body.
    preview_html = ""
    if preview_text:
        safe_preview = html_mod.escape(preview_text)
        # Pad with zero-width spaces so clients don't pull in visible body text.
        padding = "&zwnj; " * 60
        preview_html = (
            f'<div style="display:none;font-size:1px;color:#f4f4f5;'
            f'line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">'
            f"{safe_preview}{padding}</div>"
        )

    return f"""\
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Ruthva</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: {_BG};
  -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  {preview_html}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
    style="background-color: {_BG};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0" width="600">
        <tr><td>
        <![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0"
          style="max-width: 600px; width: 100%; background-color: {_CARD};
          border: 1px solid {_BORDER}; border-radius: 8px;">
          {content}
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>"""
