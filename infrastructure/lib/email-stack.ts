import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface EmailStackProps extends cdk.StackProps {
  environment: string;
  appName: string;
}

export class EmailStack extends cdk.Stack {
  public readonly configurationSet: ses.ConfigurationSet;
  public readonly bounceNotificationTopic: sns.Topic;
  public readonly complaintNotificationTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);

    const { environment, appName } = props;

    // SNS topic for bounce notifications
    this.bounceNotificationTopic = new sns.Topic(this, 'BounceNotificationTopic', {
      topicName: `${appName}-ses-bounces-${environment}`,
      displayName: 'SES Bounce Notifications',
    });

    // SNS topic for complaint notifications
    this.complaintNotificationTopic = new sns.Topic(this, 'ComplaintNotificationTopic', {
      topicName: `${appName}-ses-complaints-${environment}`,
      displayName: 'SES Complaint Notifications',
    });

    // Subscribe alert email to topics
    if (process.env.ALERT_EMAIL) {
      this.bounceNotificationTopic.addSubscription(
        new subscriptions.EmailSubscription(process.env.ALERT_EMAIL)
      );
      this.complaintNotificationTopic.addSubscription(
        new subscriptions.EmailSubscription(process.env.ALERT_EMAIL)
      );
    }

    // SES Configuration Set
    this.configurationSet = new ses.ConfigurationSet(this, 'ConfigurationSet', {
      configurationSetName: `${appName}-${environment}`,
      reputationMetrics: true,
      sendingEnabled: true,
    });

    // Event destination for bounces
    this.configurationSet.addEventDestination('BounceDestination', {
      destination: ses.EventDestination.snsTopic(this.bounceNotificationTopic),
      events: [ses.EmailSendingEvent.BOUNCE],
      enabled: true,
    });

    // Event destination for complaints
    this.configurationSet.addEventDestination('ComplaintDestination', {
      destination: ses.EventDestination.snsTopic(this.complaintNotificationTopic),
      events: [ses.EmailSendingEvent.COMPLAINT],
      enabled: true,
    });

    // Event destination for delivery notifications
    this.configurationSet.addEventDestination('DeliveryDestination', {
      destination: ses.EventDestination.snsTopic(this.bounceNotificationTopic),
      events: [ses.EmailSendingEvent.DELIVERY],
      enabled: true,
    });

    // Email templates
    this.createEmailTemplates(appName, environment);

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'SESConfigurationSet', {
      value: this.configurationSet.configurationSetName,
      description: 'SES configuration set name',
      exportName: `${appName}-SESConfigurationSet-${environment}`,
    });

    new cdk.CfnOutput(this, 'SESFromEmail', {
      value: process.env.SES_FROM_EMAIL || 'noreply@example.com',
      description: 'SES sender email address',
    });

    new cdk.CfnOutput(this, 'BounceTopicArn', {
      value: this.bounceNotificationTopic.topicArn,
      description: 'SNS topic ARN for bounce notifications',
      exportName: `${appName}-BounceTopicArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'ComplaintTopicArn', {
      value: this.complaintNotificationTopic.topicArn,
      description: 'SNS topic ARN for complaint notifications',
      exportName: `${appName}-ComplaintTopicArn-${environment}`,
    });

    // Tags
    cdk.Tags.of(this.configurationSet).add('Component', 'Email');
  }

  private createEmailTemplates(appName: string, environment: string): void {
    // Specification export email template
    new ses.CfnTemplate(this, 'ExportEmailTemplate', {
      template: {
        templateName: `${appName}-export-${environment}`,
        subjectPart: 'Your Specification Document',
        htmlPart: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Your Specification Document</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for using the Specification Wizard. Your specification document is ready!</p>
                <p>You can download your PDF or view it online using the links below:</p>
                <p>
                  <a href="{{pdfUrl}}" class="button">Download PDF</a>
                  <a href="{{magicLink}}" class="button">View Online</a>
                </p>
                <p>The online link will remain active for 30 days and can be accessed from any device.</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} FlowencyBuild. All rights reserved.</p>
                <p>This email was sent from an automated system. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textPart: `
Your Specification Document

Hello,

Thank you for using the Specification Wizard. Your specification document is ready!

Download PDF: {{pdfUrl}}
View Online: {{magicLink}}

The online link will remain active for 30 days and can be accessed from any device.

If you have any questions, please don't hesitate to contact us.

© ${new Date().getFullYear()} FlowencyBuild. All rights reserved.
        `,
      },
    });

    // Submission confirmation email template
    new ses.CfnTemplate(this, 'SubmissionEmailTemplate', {
      template: {
        templateName: `${appName}-submission-${environment}`,
        subjectPart: 'Specification Submitted - Reference #{{referenceNumber}}',
        htmlPart: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .reference { background-color: #D1FAE5; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Specification Submitted</h1>
              </div>
              <div class="content">
                <p>Hello {{name}},</p>
                <p>Thank you for submitting your specification! We've received your project details and will review them shortly.</p>
                <div class="reference">
                  <strong>Reference Number:</strong> {{referenceNumber}}
                </div>
                <p>Please save this reference number for your records. You can use it to track your submission.</p>
                <p><strong>Next Steps:</strong></p>
                <ol>
                  <li>Our team will review your specification within 1-2 business days</li>
                  <li>We'll reach out to schedule a discovery call under NDA</li>
                  <li>After the call, we'll provide a detailed quotation</li>
                </ol>
                <p>If you have any immediate questions, please contact us at {{contactEmail}}.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} FlowencyBuild. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textPart: `
Specification Submitted

Hello {{name}},

Thank you for submitting your specification! We've received your project details and will review them shortly.

Reference Number: {{referenceNumber}}

Please save this reference number for your records.

Next Steps:
1. Our team will review your specification within 1-2 business days
2. We'll reach out to schedule a discovery call under NDA
3. After the call, we'll provide a detailed quotation

If you have any immediate questions, please contact us at {{contactEmail}}.

© ${new Date().getFullYear()} FlowencyBuild. All rights reserved.
        `,
      },
    });
  }
}
