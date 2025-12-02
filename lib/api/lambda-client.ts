/**
 * Lambda API Client
 * Helper for Next.js API routes to call Lambda functions via API Gateway
 */

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || '';

if (!API_GATEWAY_URL && process.env.NODE_ENV === 'production') {
  console.warn('API_GATEWAY_URL not set! Lambda calls will fail.');
}

export interface LambdaResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callLambda<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<LambdaResponse<T>> {
  try {
    const url = `${API_GATEWAY_URL}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Lambda call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const lambdaClient = {
  /**
   * Create a new session
   */
  createSession: async () => {
    return callLambda('/sessions', {
      method: 'POST',
    });
  },

  /**
   * Get session by ID
   */
  getSession: async (sessionId: string) => {
    return callLambda(`/sessions/${sessionId}`, {
      method: 'GET',
    });
  },

  /**
   * Send a message and get AI response
   */
  handleMessage: async (sessionId: string, message: string) => {
    return callLambda(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  /**
   * Generate magic link for session
   */
  generateMagicLink: async (sessionId: string) => {
    return callLambda(`/sessions/${sessionId}/magic-link`, {
      method: 'POST',
    });
  },
};
