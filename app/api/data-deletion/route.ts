/**
 * Data Deletion Endpoint for GDPR Compliance
 * Requirements: 18.4, 18.5 - GDPR-compliant data handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { dynamoDBDocClient } from '@/lib/aws';
import { tableNames } from '@/lib/aws/config';
import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { validateEmail, sanitizeString } from '@/lib/utils/validation';
import { withSecurity } from '@/lib/middleware/security';

/**
 * POST /api/data-deletion
 * Request deletion of all user data
 * 
 * Body: { email: string, sessionId?: string }
 */
async function handleDataDeletion(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, sessionId } = body;
    
    // Validate email
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required',
        },
        { status: 400 }
      );
    }
    
    const { valid, sanitized: sanitizedEmail } = validateEmail(email);
    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address',
        },
        { status: 400 }
      );
    }
    
    const deletedSessions: string[] = [];
    
    // If sessionId provided, delete specific session
    if (sessionId) {
      const sanitizedSessionId = sanitizeString(sessionId);
      await deleteSessionData(sanitizedSessionId);
      deletedSessions.push(sanitizedSessionId);
    } else {
      // Otherwise, find all sessions associated with this email
      // This requires querying submissions table
      const sessions = await findSessionsByEmail(sanitizedEmail);
      
      for (const session of sessions) {
        await deleteSessionData(session);
        deletedSessions.push(session);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Data deletion request processed',
      deletedSessions,
    });
  } catch (error) {
    console.error('Error processing data deletion:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process data deletion request',
      },
      { status: 500 }
    );
  }
}

/**
 * Find all sessions associated with an email address
 */
async function findSessionsByEmail(email: string): Promise<string[]> {
  try {
    // Query submissions table for sessions with this email
    // Note: This requires a GSI on email field
    const command = new QueryCommand({
      TableName: tableNames.sessions,
      IndexName: 'EmailIndex', // GSI on email field
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    });
    
    const response = await dynamoDBDocClient.send(command);
    const sessions = response.Items?.map((item) => item.sessionId) || [];
    
    return sessions;
  } catch (error) {
    console.error('Error finding sessions by email:', error);
    // If GSI doesn't exist, return empty array
    return [];
  }
}

/**
 * Delete all data associated with a session
 */
async function deleteSessionData(sessionId: string): Promise<void> {
  try {
    // Query all items for this session
    const queryCommand = new QueryCommand({
      TableName: tableNames.sessions,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SESSION#${sessionId}`,
      },
    });
    
    const response = await dynamoDBDocClient.send(queryCommand);
    const items = response.Items || [];
    
    // Delete each item
    for (const item of items) {
      const deleteCommand = new DeleteCommand({
        TableName: tableNames.sessions,
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      });
      
      await dynamoDBDocClient.send(deleteCommand);
    }
    
    // Also delete any submissions
    const submissionQueryCommand = new QueryCommand({
      TableName: tableNames.sessions,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SUBMISSION#${sessionId}`,
      },
    });
    
    const submissionResponse = await dynamoDBDocClient.send(submissionQueryCommand);
    const submissions = submissionResponse.Items || [];
    
    for (const submission of submissions) {
      const deleteCommand = new DeleteCommand({
        TableName: tableNames.sessions,
        Key: {
          PK: submission.PK,
          SK: submission.SK,
        },
      });
      
      await dynamoDBDocClient.send(deleteCommand);
    }
  } catch (error) {
    console.error('Error deleting session data:', error);
    throw error;
  }
}

// Apply security middleware
export const POST = withSecurity(handleDataDeletion);
