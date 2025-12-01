/**
 * ProgressTracker Service
 * Tracks specification completion progress and adapts to project complexity
 */

import { Specification, ProgressState, Topic } from '../models/types';

/**
 * Project types recognized by the system
 */
export type ProjectType =
  | 'website'
  | 'booking-system'
  | 'crm'
  | 'mobile-app'
  | 'e-commerce'
  | 'web-application'
  | 'api'
  | 'unknown';

/**
 * Core topics that should be covered in any specification
 */
const CORE_TOPICS = [
  { id: 'overview', name: 'Project Overview', required: true },
  { id: 'users', name: 'Target Users', required: true },
  { id: 'features', name: 'Key Features', required: true },
];

/**
 * Additional topics based on project complexity
 */
const SIMPLE_PROJECT_TOPICS = [
  { id: 'integrations', name: 'Integrations', required: false },
];

const MEDIUM_PROJECT_TOPICS = [
  { id: 'integrations', name: 'Integrations', required: true },
  { id: 'data', name: 'Data Requirements', required: true },
  { id: 'workflows', name: 'User Workflows', required: false },
];

const COMPLEX_PROJECT_TOPICS = [
  { id: 'integrations', name: 'Integrations', required: true },
  { id: 'data', name: 'Data Requirements', required: true },
  { id: 'workflows', name: 'User Workflows', required: true },
  { id: 'security', name: 'Security Requirements', required: true },
  { id: 'performance', name: 'Performance Requirements', required: true },
  { id: 'scalability', name: 'Scalability Requirements', required: false },
];

/**
 * Project type specific topics
 */
const PROJECT_TYPE_TOPICS: Record<ProjectType, Array<{ id: string; name: string; required: boolean }>> = {
  'website': [
    { id: 'seo', name: 'SEO Requirements', required: false },
    { id: 'content', name: 'Content Management', required: false },
  ],
  'booking-system': [
    { id: 'calendar', name: 'Calendar Integration', required: true },
    { id: 'notifications', name: 'Notification System', required: true },
    { id: 'payments', name: 'Payment Processing', required: true },
  ],
  'crm': [
    { id: 'contacts', name: 'Contact Management', required: true },
    { id: 'reporting', name: 'Reporting & Analytics', required: true },
    { id: 'automation', name: 'Workflow Automation', required: false },
  ],
  'mobile-app': [
    { id: 'platforms', name: 'Platform Requirements', required: true },
    { id: 'offline', name: 'Offline Functionality', required: false },
    { id: 'push-notifications', name: 'Push Notifications', required: false },
  ],
  'e-commerce': [
    { id: 'products', name: 'Product Catalog', required: true },
    { id: 'cart', name: 'Shopping Cart', required: true },
    { id: 'payments', name: 'Payment Processing', required: true },
    { id: 'shipping', name: 'Shipping & Fulfillment', required: true },
  ],
  'web-application': [],
  'api': [
    { id: 'endpoints', name: 'API Endpoints', required: true },
    { id: 'authentication', name: 'Authentication', required: true },
    { id: 'rate-limiting', name: 'Rate Limiting', required: false },
  ],
  'unknown': [],
};

export class ProgressTracker {
  /**
   * Update progress based on current specification
   */
  async updateProgress(specification: Specification): Promise<ProgressState> {
    // Determine project complexity
    const projectComplexity = this.determineProjectComplexity(specification);

    // Determine project type
    const projectType = this.determineProjectType(specification);

    // Get required topics for this project
    const topics = this.getRequiredTopics(projectType, projectComplexity);

    // Update topic statuses based on specification content
    const updatedTopics = this.updateTopicStatuses(topics, specification);

    // Calculate overall completeness
    const overallCompleteness = this.calculateCompleteness(updatedTopics);

    return {
      topics: updatedTopics,
      overallCompleteness,
      projectComplexity,
    };
  }

  /**
   * Determine project complexity based on requirements
   */
  determineProjectComplexity(specification: Specification): 'Simple' | 'Medium' | 'Complex' {
    const reqCount = specification.formalPRD.requirements.length;
    const nfrCount = specification.formalPRD.nonFunctionalRequirements.length;
    const featureCount = specification.plainEnglishSummary.keyFeatures.length;
    const integrationCount = specification.plainEnglishSummary.integrations.length;

    // Calculate complexity score
    const complexityScore = 
      reqCount * 1 + 
      nfrCount * 2 + 
      featureCount * 0.5 + 
      integrationCount * 1.5;

    if (complexityScore <= 5) {
      return 'Simple';
    } else if (complexityScore <= 15) {
      return 'Medium';
    } else {
      return 'Complex';
    }
  }

  /**
   * Get required topics based on project type and complexity
   */
  getRequiredTopics(
    projectType: ProjectType,
    complexity: 'Simple' | 'Medium' | 'Complex'
  ): Topic[] {
    const topics: Topic[] = [];

    // Add core topics (always required)
    CORE_TOPICS.forEach((topic) => {
      topics.push({
        id: topic.id,
        name: topic.name,
        status: 'not-started',
        required: topic.required,
      });
    });

    // Add complexity-based topics
    let complexityTopics: Array<{ id: string; name: string; required: boolean }> = [];
    if (complexity === 'Simple') {
      complexityTopics = SIMPLE_PROJECT_TOPICS;
    } else if (complexity === 'Medium') {
      complexityTopics = MEDIUM_PROJECT_TOPICS;
    } else {
      complexityTopics = COMPLEX_PROJECT_TOPICS;
    }

    complexityTopics.forEach((topic) => {
      // Avoid duplicates
      if (!topics.find((t) => t.id === topic.id)) {
        topics.push({
          id: topic.id,
          name: topic.name,
          status: 'not-started',
          required: topic.required,
        });
      }
    });

    // Add project type specific topics
    const typeTopics = PROJECT_TYPE_TOPICS[projectType] || [];
    typeTopics.forEach((topic) => {
      // Avoid duplicates
      if (!topics.find((t) => t.id === topic.id)) {
        topics.push({
          id: topic.id,
          name: topic.name,
          status: 'not-started',
          required: topic.required,
        });
      }
    });

    return topics;
  }

  /**
   * Determine project type from specification content
   */
  private determineProjectType(specification: Specification): ProjectType {
    const overview = specification.plainEnglishSummary.overview.toLowerCase();
    const features = specification.plainEnglishSummary.keyFeatures
      .map((f) => f.toLowerCase())
      .join(' ');
    const allText = `${overview} ${features}`;

    // Check for booking system keywords
    if (
      allText.includes('booking') ||
      allText.includes('appointment') ||
      allText.includes('reservation') ||
      allText.includes('schedule')
    ) {
      return 'booking-system';
    }

    // Check for e-commerce keywords
    if (
      allText.includes('shop') ||
      allText.includes('store') ||
      allText.includes('product') ||
      allText.includes('cart') ||
      allText.includes('checkout') ||
      allText.includes('e-commerce') ||
      allText.includes('ecommerce')
    ) {
      return 'e-commerce';
    }

    // Check for CRM keywords
    if (
      allText.includes('crm') ||
      allText.includes('customer relationship') ||
      allText.includes('contact management') ||
      allText.includes('lead')
    ) {
      return 'crm';
    }

    // Check for mobile app keywords
    if (
      allText.includes('mobile app') ||
      allText.includes('ios') ||
      allText.includes('android') ||
      allText.includes('smartphone')
    ) {
      return 'mobile-app';
    }

    // Check for API keywords
    if (
      allText.includes('api') ||
      allText.includes('endpoint') ||
      allText.includes('rest') ||
      allText.includes('graphql')
    ) {
      return 'api';
    }

    // Check for website keywords
    if (
      allText.includes('website') ||
      allText.includes('landing page') ||
      allText.includes('marketing site') ||
      allText.includes('blog')
    ) {
      return 'website';
    }

    // Default to web application
    if (
      allText.includes('web') ||
      allText.includes('application') ||
      allText.includes('platform')
    ) {
      return 'web-application';
    }

    return 'unknown';
  }

  /**
   * Update topic statuses based on specification content
   */
  private updateTopicStatuses(topics: Topic[], specification: Specification): Topic[] {
    return topics.map((topic) => {
      const status = this.getTopicStatus(topic.id, specification);
      return {
        ...topic,
        status,
      };
    });
  }

  /**
   * Get status for a specific topic
   */
  private getTopicStatus(
    topicId: string,
    specification: Specification
  ): 'not-started' | 'in-progress' | 'complete' {
    const summary = specification.plainEnglishSummary;
    const prd = specification.formalPRD;

    switch (topicId) {
      case 'overview':
        if (!summary.overview) return 'not-started';
        if (summary.overview.length < 20) return 'in-progress';
        return 'complete';

      case 'users':
        if (!summary.targetUsers) return 'not-started';
        if (summary.targetUsers.length < 10) return 'in-progress';
        return 'complete';

      case 'features':
        if (summary.keyFeatures.length === 0) return 'not-started';
        if (summary.keyFeatures.length < 3) return 'in-progress';
        return 'complete';

      case 'integrations':
        if (summary.integrations.length === 0) return 'not-started';
        return 'complete';

      case 'data':
        return this.checkForDataRequirements(prd);

      case 'workflows':
        return this.checkForWorkflows(prd);

      case 'security':
      case 'performance':
      case 'scalability':
        return this.checkForNFRCategory(prd, topicId);

      // Project-specific topics
      case 'seo':
      case 'content':
      case 'calendar':
      case 'notifications':
      case 'payments':
      case 'contacts':
      case 'reporting':
      case 'automation':
      case 'platforms':
      case 'offline':
      case 'push-notifications':
      case 'products':
      case 'cart':
      case 'shipping':
      case 'endpoints':
      case 'authentication':
      case 'rate-limiting':
        return this.checkForKeyword(specification, topicId);

      default:
        return 'not-started';
    }
  }

  /**
   * Check for data requirements in PRD
   */
  private checkForDataRequirements(prd: any): 'not-started' | 'in-progress' | 'complete' {
    const hasDataRequirements = prd.requirements.some(
      (req: any) =>
        req.userStory.toLowerCase().includes('data') ||
        req.acceptanceCriteria.some((ac: string) => ac.toLowerCase().includes('data'))
    );

    if (!hasDataRequirements) return 'not-started';

    // Check if it's detailed enough
    const dataReqCount = prd.requirements.filter(
      (req: any) =>
        req.userStory.toLowerCase().includes('data') ||
        req.acceptanceCriteria.some((ac: string) => ac.toLowerCase().includes('data'))
    ).length;

    if (dataReqCount < 2) return 'in-progress';
    return 'complete';
  }

  /**
   * Check for workflows in PRD
   */
  private checkForWorkflows(prd: any): 'not-started' | 'in-progress' | 'complete' {
    const hasWorkflows = prd.requirements.some(
      (req: any) =>
        req.userStory.toLowerCase().includes('workflow') ||
        req.acceptanceCriteria.some((ac: string) => ac.toLowerCase().includes('workflow'))
    );

    return hasWorkflows ? 'complete' : 'not-started';
  }

  /**
   * Check for NFR category
   */
  private checkForNFRCategory(
    prd: any,
    category: string
  ): 'not-started' | 'in-progress' | 'complete' {
    const hasNFR = prd.nonFunctionalRequirements.some(
      (nfr: any) => nfr.category.toLowerCase() === category.toLowerCase()
    );

    return hasNFR ? 'complete' : 'not-started';
  }

  /**
   * Check for keyword in specification
   */
  private checkForKeyword(
    specification: Specification,
    keyword: string
  ): 'not-started' | 'in-progress' | 'complete' {
    const allText = `
      ${specification.plainEnglishSummary.overview}
      ${specification.plainEnglishSummary.keyFeatures.join(' ')}
      ${specification.plainEnglishSummary.integrations.join(' ')}
      ${specification.formalPRD.requirements.map((r) => r.userStory).join(' ')}
    `.toLowerCase();

    // Map topic IDs to searchable keywords
    const keywordMap: Record<string, string[]> = {
      'seo': ['seo', 'search engine', 'optimization'],
      'content': ['content', 'cms', 'content management'],
      'calendar': ['calendar', 'schedule', 'appointment'],
      'notifications': ['notification', 'notify', 'alert', 'email'],
      'payments': ['payment', 'pay', 'stripe', 'paypal', 'checkout'],
      'contacts': ['contact', 'customer', 'client'],
      'reporting': ['report', 'analytics', 'dashboard'],
      'automation': ['automation', 'automate', 'workflow'],
      'platforms': ['ios', 'android', 'platform'],
      'offline': ['offline', 'sync'],
      'push-notifications': ['push', 'notification'],
      'products': ['product', 'catalog', 'inventory'],
      'cart': ['cart', 'basket', 'shopping'],
      'shipping': ['shipping', 'delivery', 'fulfillment'],
      'endpoints': ['endpoint', 'route', 'api'],
      'authentication': ['auth', 'login', 'authentication'],
      'rate-limiting': ['rate limit', 'throttle'],
    };

    const searchTerms = keywordMap[keyword] || [keyword];
    const found = searchTerms.some((term) => allText.includes(term));

    return found ? 'complete' : 'not-started';
  }

  /**
   * Calculate overall completeness percentage
   */
  private calculateCompleteness(topics: Topic[]): number {
    if (topics.length === 0) return 0;

    // Only count required topics for completeness
    const requiredTopics = topics.filter((t) => t.required);
    if (requiredTopics.length === 0) return 100;

    const completedCount = requiredTopics.filter((t) => t.status === 'complete').length;
    const inProgressCount = requiredTopics.filter((t) => t.status === 'in-progress').length;

    // In-progress topics count as 50% complete
    const totalProgress = completedCount + inProgressCount * 0.5;

    return Math.round((totalProgress / requiredTopics.length) * 100);
  }
}
