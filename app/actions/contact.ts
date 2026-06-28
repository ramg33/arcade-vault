'use server';

import { Resend } from 'resend';

type ContactForm = { name: string; email: string; msg: string };

export async function sendContactEmail(
  data: ContactForm,
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: 'Missing RESEND_API_KEY environment variable.' };
  }

  const resend = new Resend(key);

  try {
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'rodrigo.moza24@gmail.com',
      subject: `Contact form message from ${data.name}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\n\n${data.msg}`,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
