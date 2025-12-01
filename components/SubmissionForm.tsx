'use client';

/**
 * SubmissionForm Component
 * Form for collecting contact information and submitting specifications
 */

import React, { useState } from 'react';
import type { ContactInfo } from '../lib/models/types';

export interface SubmissionFormProps {
  onSubmit: (contactInfo: ContactInfo) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: '',
    budgetRange: '',
    timeline: '',
    referralSource: '',
    urgency: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email || formData.email.trim().length === 0) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone || formData.phone.trim().length === 0) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const handleChange = (field: keyof ContactInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Submit Your Specification</h2>
        <p className="text-gray-600">
          Please provide your contact information to receive a quotation for your project.
        </p>
      </div>

      {/* Required Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
            placeholder="John Doe"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
            placeholder="john@example.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Additional Information (Optional)</h3>

        {/* Budget Range */}
        <div>
          <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-700 mb-1">
            Budget Range
          </label>
          <select
            id="budgetRange"
            value={formData.budgetRange || ''}
            onChange={(e) => handleChange('budgetRange', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="">Select a range</option>
            <option value="Under $10k">Under $10k</option>
            <option value="$10k - $25k">$10k - $25k</option>
            <option value="$25k - $50k">$25k - $50k</option>
            <option value="$50k - $100k">$50k - $100k</option>
            <option value="$100k+">$100k+</option>
          </select>
        </div>

        {/* Timeline */}
        <div>
          <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-1">
            Desired Timeline
          </label>
          <select
            id="timeline"
            value={formData.timeline || ''}
            onChange={(e) => handleChange('timeline', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="">Select a timeline</option>
            <option value="ASAP">ASAP</option>
            <option value="1-3 months">1-3 months</option>
            <option value="3-6 months">3-6 months</option>
            <option value="6-12 months">6-12 months</option>
            <option value="Flexible">Flexible</option>
          </select>
        </div>

        {/* Referral Source */}
        <div>
          <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700 mb-1">
            How did you hear about us?
          </label>
          <input
            type="text"
            id="referralSource"
            value={formData.referralSource || ''}
            onChange={(e) => handleChange('referralSource', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
            placeholder="Google, referral, social media, etc."
          />
        </div>

        {/* Urgency */}
        <div>
          <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
            Project Urgency
          </label>
          <select
            id="urgency"
            value={formData.urgency || ''}
            onChange={(e) => handleChange('urgency', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="">Select urgency level</option>
            <option value="Low">Low - Just exploring</option>
            <option value="Medium">Medium - Planning ahead</option>
            <option value="High">High - Need to start soon</option>
            <option value="Critical">Critical - Urgent need</option>
          </select>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Specification'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 text-center">
        <span className="text-red-500">*</span> Required fields
      </p>
    </form>
  );
};
