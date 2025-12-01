/**
 * SES Client Configuration
 */

import { SESClient } from '@aws-sdk/client-ses';
import { sesConfig } from './config';

// Create SES client
export const sesClient = new SESClient(sesConfig);
