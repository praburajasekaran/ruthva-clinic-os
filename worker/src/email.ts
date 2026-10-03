import { AwsClient } from "aws4fetch";
import { ApiError, check, record } from "./data";
import type { Env } from "./data";

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
): Promise<{ messageId: string }> {
  if (env.TEST_EMAIL === "capture") return { messageId: "local-test" };
  const region = env.AWS_SES_REGION;
  check(
    /^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region ?? "") &&
      env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY &&
      env.DEFAULT_FROM_EMAIL,
    "Amazon SES is not configured.",
    503,
  );
  const client = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN,
    service: "ses",
    region,
    retries: 0,
  });
  const domain = region.startsWith("cn-")
    ? "amazonaws.com.cn"
    : "amazonaws.com";
  let response: Response;
  try {
    response = await client.fetch(
      `https://email.${region}.${domain}/v2/email/outbound-emails`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FromEmailAddress: env.DEFAULT_FROM_EMAIL,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: "UTF-8" },
              Body: { Html: { Data: html, Charset: "UTF-8" } },
            },
          },
        }),
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw new ApiError(503, "Amazon SES could not be reached.");
  }
  check(response.ok, "Amazon SES rejected email delivery.", 503);
  let data;
  try {
    data = record(await response.json());
  } catch {
    throw new ApiError(503, "Amazon SES returned an invalid delivery receipt.");
  }
  check(
    typeof data.MessageId === "string" && data.MessageId.length > 0,
    "Amazon SES returned an invalid delivery receipt.",
    503,
  );
  return { messageId: data.MessageId };
}
