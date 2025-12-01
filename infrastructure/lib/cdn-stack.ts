import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface CDNStackProps extends cdk.StackProps {
  environment: string;
  appName: string;
  exportsBucket: s3.Bucket;
}

export class CDNStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CDNStackProps) {
    super(scope, id, props);

    const { environment, appName, exportsBucket } = props;

    // Only create CloudFront if enabled
    if (process.env.ENABLE_CLOUDFRONT !== 'true') {
      new cdk.CfnOutput(this, 'CloudFrontStatus', {
        value: 'Disabled',
        description: 'CloudFront distribution is disabled',
      });
      return;
    }

    // Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OAI',
      {
        comment: `OAI for ${appName} exports bucket`,
      }
    );

    // Grant CloudFront read access to S3 bucket
    exportsBucket.grantRead(originAccessIdentity);

    // Cache policy for PDFs (long cache duration)
    const pdfCachePolicy = new cloudfront.CachePolicy(this, 'PDFCachePolicy', {
      cachePolicyName: `${appName}-pdf-cache-${environment}`,
      comment: 'Cache policy for PDF exports',
      defaultTtl: cdk.Duration.days(7),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Response headers policy for security
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeadersPolicy',
      {
        responseHeadersPolicyName: `${appName}-security-headers-${environment}`,
        comment: 'Security headers for CloudFront distribution',
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(31536000),
            includeSubdomains: true,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Cache-Control',
              value: 'public, max-age=604800, immutable',
              override: false,
            },
          ],
        },
      }
    );

    // Certificate for custom domain (if provided)
    let certificate: acm.ICertificate | undefined;
    if (process.env.CERTIFICATE_ARN) {
      certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        process.env.CERTIFICATE_ARN
      );
    }

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${appName} exports CDN - ${environment}`,
      defaultBehavior: {
        origin: new origins.S3Origin(exportsBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: pdfCachePolicy,
        responseHeadersPolicy,
        compress: true,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: environment === 'production',
      ...(process.env.DOMAIN_NAME && certificate && {
        domainNames: [process.env.DOMAIN_NAME],
        certificate,
      }),
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${appName}-CloudFrontDistributionId-${environment}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionDomain', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${appName}-CloudFrontDomain-${environment}`,
    });

    if (process.env.DOMAIN_NAME) {
      new cdk.CfnOutput(this, 'CustomDomain', {
        value: process.env.DOMAIN_NAME,
        description: 'Custom domain name for CloudFront',
      });
    }

    // Tags
    cdk.Tags.of(this.distribution).add('Component', 'CDN');
  }
}
