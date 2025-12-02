/**
 * Lambda: Generate Magic Link
 * Generates a magic link token for session restoration
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SessionManager } from './lib/session-manager';

const sessionManager = new SessionManager();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.id;

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Session ID is required',
        }),
      };
    }

    console.log('Generating magic link for session:', sessionId);

    const token = await sessionManager.generateMagicLink(sessionId);
    const magicLink = `${process.env.APP_URL}/restore/${token}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        success: true,
        magicLink,
        token,
      }),
    };
  } catch (error) {
    console.error('Error generating magic link:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to generate magic link',
      }),
    };
  }
};
