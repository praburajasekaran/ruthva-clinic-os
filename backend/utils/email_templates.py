"""Shared email template components for Ruthva transactional emails.

Sentry-inspired design: bold typography, strong visual hierarchy,
solid gray background with white content card, emerald brand palette.
"""

import html as html_mod

from django.conf import settings

# ---------------------------------------------------------------------------
# Design tokens — aligned with clinic OS globals.css
# ---------------------------------------------------------------------------
_BG = "#f2efe8"           # --color-canvas  – warm page background
_CARD = "#fffdf8"         # --color-surface  – warm white content card
_PRIMARY = "#2f5f44"      # --color-brand-700 – CTA, links, emphasis
_PRIMARY_DARK = "#1a3c2a" # --color-brand-900 – accent bar, bold elements
_PRIMARY_LIGHT = "#eff6f1" # --color-brand-50 – subtle tinted backgrounds
_TEXT = "#1d261f"          # --color-text-primary  – headings
_TEXT_BODY = "#3d4d3f"     # --color-text-secondary – body text
_TEXT_MUTED = "#555f57"    # --color-text-muted – footer, captions (WCAG AA)
_BORDER = "#ddd5c8"       # --color-border – card border, dividers
_DATA_BG = "#f7f3ec"      # --color-surface-raised – structured data card
_FONT = "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"


def email_header(topic: str, logo_url: str = "") -> str:
    """Emerald accent bar + clinic logo / Ruthva wordmark + topic label."""
    safe_topic = html_mod.escape(topic)

    if logo_url:
        safe_logo = html_mod.escape(logo_url)
        brand_html = (
            f'<img src="{safe_logo}" alt="Clinic logo"'
            f' style="height: 36px; width: auto; display: block;"'
            f' height="36" />'
        )
    else:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        ruthva_logo = html_mod.escape(f"{frontend_url}/ruthva-logo.png")
        brand_html = (
            f'<img src="{ruthva_logo}" alt="Ruthva"'
            f' style="height: 36px; width: auto; display: block;"'
            f' height="36" />'
        )

    return f"""\
<tr>
  <td style="padding: 0;">
    <div style="background-color: {_PRIMARY_DARK}; height: 4px; border-radius: 8px 8px 0 0;"></div>
  </td>
</tr>
<tr>
  <td style="padding: 36px 40px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td>
          {brand_html}
        </td>
        <td align="right">
          <span style="font-family: {_FONT}; font-size: 11px; font-weight: 700;
             text-transform: uppercase; letter-spacing: 0.1em;
             color: {_PRIMARY}; background-color: {_PRIMARY_LIGHT};
             padding: 4px 10px; border-radius: 4px;">
            {safe_topic}
          </span>
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding: 20px 40px 0;">
    <div style="border-top: 1px solid {_BORDER};"></div>
  </td>
</tr>"""


def email_footer(clinic_name: str = "", doctor_name: str = "") -> str:
    """Optional clinic signature + branded Ruthva footer."""
    signature = ""
    if doctor_name or clinic_name:
        parts = []
        if doctor_name:
            parts.append(
                f'<strong style="color: {_TEXT};">'
                f"{html_mod.escape(doctor_name)}</strong>"
            )
        if clinic_name:
            parts.append(
                f'<span style="color: {_TEXT_BODY};">'
                f"{html_mod.escape(clinic_name)}</span>"
            )
        signature = f"""\
<tr>
  <td style="padding: 28px 40px 0;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 15px;
       line-height: 1.7; color: {_TEXT_BODY};">
      Warm regards,<br>{'<br>'.join(parts)}
    </p>
  </td>
</tr>"""

    return f"""\
{signature}
<tr>
  <td style="padding: 32px 40px 0;">
    <div style="border-top: 1px solid {_BORDER};"></div>
  </td>
</tr>
<tr>
  <td style="padding: 20px 40px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="https://ruthva.com" style="font-family: {_FONT}; font-size: 15px; font-weight: 800;
             letter-spacing: -0.02em; color: {_PRIMARY}; text-decoration: underline;
             text-underline-offset: 3px;">ruthva</a>
          <p style="margin: 6px 0 0; font-family: {_FONT}; font-size: 12px;
             color: {_TEXT_MUTED};">
            Clinic management, simplified.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>"""


def email_button(text: str, url: str) -> str:
    """Bold emerald CTA button — large, confident, high contrast."""
    safe_text = html_mod.escape(text)
    safe_url = html_mod.escape(url)
    return f"""\
<tr>
  <td style="padding: 32px 40px 0;" align="center">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{safe_url}"
      style="height:52px;v-text-anchor:middle;width:240px;" arcsize="10%"
      strokecolor="{_PRIMARY_DARK}" fillcolor="{_PRIMARY_DARK}">
    <center style="color:#ffffff;font-family:{_FONT};font-size:16px;font-weight:700;">
      {safe_text}
    </center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="{safe_url}"
       style="display: inline-block; background-color: {_PRIMARY_DARK}; color: #ffffff;
              font-family: {_FONT}; font-size: 16px; font-weight: 700;
              text-decoration: none; padding: 14px 40px; border-radius: 8px;
              letter-spacing: 0.01em; mso-hide: all;">
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
  <td style="padding: 6px 0; font-family: {_FONT}; font-size: 13px;
     font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em;
     color: {_TEXT_MUTED}; width: 110px; vertical-align: top;">
    {safe_label}
  </td>
  <td style="padding: 6px 0; font-family: {_FONT}; font-size: 15px;
     color: {_TEXT}; vertical-align: top;">
    {safe_value}
  </td>
</tr>"""


def email_data_card(rows: list[tuple[str, str]], title: str = "") -> str:
    """Card with left accent border, structured key-value data."""
    title_html = ""
    if title:
        safe_title = html_mod.escape(title)
        title_html = (
            f'<p style="margin: 0 0 14px; font-family: {_FONT}; font-size: 11px;'
            f' font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;'
            f' color: {_PRIMARY};">{safe_title}</p>'
        )

    rows_html = "\n".join(email_data_row(label, value) for label, value in rows)

    return f"""\
<tr>
  <td style="padding: 24px 40px 0;">
    <div style="background-color: {_DATA_BG}; border-left: 3px solid {_PRIMARY};
         border-radius: 0 8px 8px 0; padding: 20px 24px;">
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
       line-height: 1.7; color: {_TEXT_BODY};">
      {text}
    </p>
  </td>
</tr>"""


def email_heading(text: str) -> str:
    """Large heading for primary message."""
    safe_text = html_mod.escape(text)
    return f"""\
<tr>
  <td style="padding: 24px 40px 0;">
    <h1 style="margin: 0; font-family: {_FONT}; font-size: 28px;
       font-weight: 800; letter-spacing: -0.02em; color: {_TEXT};">
      {safe_text}
    </h1>
  </td>
</tr>"""


def email_code(code: str) -> str:
    """Large monospace code display (for OTP codes)."""
    safe_code = html_mod.escape(code)
    return f"""\
<tr>
  <td style="padding: 28px 40px 0;" align="center">
    <div style="background-color: {_PRIMARY_DARK}; border-radius: 10px;
         padding: 28px 40px; display: inline-block;">
      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono',
         Menlo, monospace; font-size: 38px; font-weight: 700;
         letter-spacing: 10px; color: #ffffff;">
        {safe_code}
      </span>
    </div>
  </td>
</tr>"""


def email_muted_text(text: str) -> str:
    """Small muted text for secondary information."""
    return f"""\
<tr>
  <td style="padding: 14px 40px 0;">
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
  <td style="padding: 20px 40px 0;">
    <p style="margin: 0; font-family: {_FONT}; font-size: 12px;
       color: {_TEXT_MUTED}; text-align: center; line-height: 1.6;">
      Or copy and paste this link into your browser:<br>
      <a href="{safe_url}" style="color: {_PRIMARY}; word-break: break-all;
         font-size: 12px;">
        {safe_url}
      </a>
    </p>
  </td>
</tr>"""


def email_wrapper(content: str, preview_text: str = "") -> str:
    """Full HTML document with gray background, white content card, responsive wrapper.

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
          border: 1px solid {_BORDER}; border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
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
