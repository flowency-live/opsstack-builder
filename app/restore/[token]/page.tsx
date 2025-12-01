/**
 * Magic Link Restore Page
 * Restores a session from a magic link token
 * 
 * Requirements: 6.3, 6.4, 7.2
 */

import { redirect } from 'next/navigation';
import { sessionManager } from '@/lib/services/session-manager';

interface RestorePageProps {
  params: {
    token: string;
  };
}

export default async function RestorePage({ params }: RestorePageProps) {
  const { token } = params;

  try {
    // Restore session from magic link
    const session = await sessionManager.restoreSessionFromMagicLink(token);

    if (!session) {
      // Token invalid or expired
      redirect('/error?message=Invalid or expired magic link');
    }

    // Redirect to chat with restored session
    redirect(`/chat?sessionId=${session.id}`);
  } catch (error) {
    console.error('Failed to restore session:', error);
    redirect('/error?message=Failed to restore session');
  }
}
