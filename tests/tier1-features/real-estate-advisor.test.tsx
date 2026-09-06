import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RealEstateAdvisor, { calculatePropertyFit, DISTRICT_BENCHMARKS } from '../../src/components/RealEstateAdvisor';
import { extractAdvisorState } from '../../src/ai';
import { TRANSLATIONS } from '../../src/constants';
import { AdvisorFinancialProfile } from '../../src/types';
import { MOCK_TEST_PROPERTIES } from '../helpers/fixtures';
import App from '../../src/App';
import * as firebase from '../../src/firebase';

describe('Real Estate Advisor & Financial Intelligence Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('hettety_consent', JSON.stringify({ necessary: true }));
    window.location.hash = '';

    vi.spyOn(firebase, 'getDocs').mockImplementation(async () => {
      return {
        docs: MOCK_TEST_PROPERTIES.map((p) => ({
          id: p.id,
          data: () => p,
        })),
      } as any;
    });
  });

  describe('1. Financial Matching Engine (calculatePropertyFit)', () => {
    it('classifies a property within budget as a perfect fit', () => {
      const property = MOCK_TEST_PROPERTIES[1]; // Modern New Cairo Penthouse, 8.5M
      const profile: AdvisorFinancialProfile = {
        budget: 10000000,
        downPayment: 2000000,
        monthlyCapacity: 150000,
        currency: 'EGP',
        purpose: 'investment',
        preferredLocation: 'New Cairo',
        propertyType: 'All',
        deliveryTimeline: 'all',
      };

      const fit = calculatePropertyFit(property, profile, false);

      expect(fit.category).toBe('perfect');
      expect(fit.matchScore).toBeGreaterThanOrEqual(80);
      expect(fit.downPaymentRequired).toBe(8500000 * 0.15); // 1.275M
      expect(fit.downPaymentRequired).toBeLessThanOrEqual(profile.downPayment);
      expect(fit.monthlyInstallment).toBeLessThanOrEqual(profile.monthlyCapacity);
      expect(fit.reasons.length).toBeGreaterThan(0);
      expect(fit.rentalYieldPercent).toBeGreaterThan(0);
      expect(fit.paybackYears).toBeGreaterThan(0);
    });

    it('classifies a property slightly exceeding budget as a stretch fit', () => {
      const property = MOCK_TEST_PROPERTIES[1]; // 8.5M
      const profile: AdvisorFinancialProfile = {
        budget: 7800000, // property is ~9% higher (within stretch threshold)
        downPayment: 1500000,
        monthlyCapacity: 120000,
        currency: 'EGP',
        purpose: 'residential',
        preferredLocation: 'all',
        propertyType: 'All',
        deliveryTimeline: 'all',
      };

      const fit = calculatePropertyFit(property, profile, false);

      expect(fit.category).toBe('stretch');
      expect(fit.reasons.some((r) => r.toLowerCase().includes('budget') || r.includes('الميزانية'))).toBe(true);
    });

    it('classifies a property substantially over budget as a mismatch with explicit reasons', () => {
      const property = MOCK_TEST_PROPERTIES[0]; // Luxury Beachfront Villa, 15M
      const profile: AdvisorFinancialProfile = {
        budget: 5000000, // much lower than 15M
        downPayment: 1000000,
        monthlyCapacity: 50000,
        currency: 'EGP',
        purpose: 'investment',
        preferredLocation: 'all',
        propertyType: 'All',
        deliveryTimeline: 'all',
      };

      const fit = calculatePropertyFit(property, profile, false);

      expect(fit.category).toBe('mismatch');
      expect(fit.matchScore).toBeLessThan(55);
      expect(fit.reasons.length).toBeGreaterThan(0);
    });

    it('adjusts yield benchmarks for commercial and North Coast chalets', () => {
      expect(DISTRICT_BENCHMARKS['North Coast'].rentalYield).toBe(14.0);
      expect(DISTRICT_BENCHMARKS['New Cairo'].rentalYield).toBe(8.5);
      expect(DISTRICT_BENCHMARKS['Sheikh Zayed'].capitalGrowth).toBe(19.0);
    });
  });

  describe('2. AI Advisor State Extraction & Marker Parser', () => {
    it('extracts structured advisor state JSON and removes the marker from text', () => {
      const rawResponse = `بناءً على طلبك، تم تجهيز خطة استثمارية متوازنة تناسب ميزانيتك.
[ADVISOR_STATE:{"budget":12000000,"downPayment":2500000,"monthlyCapacity":110000,"purpose":"investment","preferredLocation":"New Cairo","deliveryTimeline":"1-2years"}]
هذه الخطة ستحقق لك أعلى عائد رأسمالي في التجمع الخامس.`;

      const { cleanText, statePatch } = extractAdvisorState(rawResponse);

      expect(statePatch).toBeDefined();
      expect(statePatch?.budget).toBe(12000000);
      expect(statePatch?.downPayment).toBe(2500000);
      expect(statePatch?.monthlyCapacity).toBe(110000);
      expect(statePatch?.purpose).toBe('investment');
      expect(statePatch?.preferredLocation).toBe('New Cairo');
      expect(statePatch?.deliveryTimeline).toBe('1-2years');

      expect(cleanText).not.toContain('[ADVISOR_STATE:');
      expect(cleanText).toContain('بناءً على طلبك');
      expect(cleanText).toContain('أعلى عائد رأسمالي');
    });

    it('handles malformed advisor state JSON without crashing', () => {
      const rawResponse = `Here is your summary [ADVISOR_STATE:{broken_json: missing_quotes}] Have a good day!`;
      const { cleanText, statePatch } = extractAdvisorState(rawResponse);

      expect(statePatch).toBeUndefined();
      expect(cleanText).toBe('Here is your summary  Have a good day!');
    });

    it('returns original text when no marker is present', () => {
      const text = 'Hello, I am your advisor.';
      const { cleanText, statePatch } = extractAdvisorState(text);

      expect(statePatch).toBeUndefined();
      expect(cleanText).toBe(text);
    });
  });

  describe('3. RealEstateAdvisor Component UI & Financial Dashboard', () => {
    it('renders financial inputs, sliders, and macro metric cards', () => {
      render(
        <RealEstateAdvisor
          t={TRANSLATIONS.en}
          isRtl={false}
          properties={MOCK_TEST_PROPERTIES}
          userName="Tarek"
        />
      );

      // Verify title & badges
      expect(screen.getByText(TRANSLATIONS.en.advisor_title)).toBeInTheDocument();
      expect(screen.getByText(TRANSLATIONS.en.advisor_subtitle)).toBeInTheDocument();

      // Verify financial inputs
      expect(screen.getByText(TRANSLATIONS.en.advisor_budget_label)).toBeInTheDocument();
      expect(screen.getByText(TRANSLATIONS.en.advisor_down_payment_label)).toBeInTheDocument();
      expect(screen.getByText(TRANSLATIONS.en.advisor_monthly_capacity_label)).toBeInTheDocument();

      // Verify ROI metric cards
      expect(screen.getByText(TRANSLATIONS.en.advisor_metric_yield)).toBeInTheDocument();
      expect(screen.getByText(TRANSLATIONS.en.advisor_metric_growth)).toBeInTheDocument();
      expect(screen.getByText(TRANSLATIONS.en.advisor_metric_total_return)).toBeInTheDocument();
      expect(screen.getByText(TRANSLATIONS.en.advisor_metric_payback)).toBeInTheDocument();
    });

    it('filters properties by category tabs and allows asking advisor about a unit', async () => {
      render(
        <RealEstateAdvisor
          t={TRANSLATIONS.en}
          isRtl={false}
          properties={MOCK_TEST_PROPERTIES}
          userName="Tarek"
        />
      );

      // Category filter buttons
      const perfectTabs = screen.getAllByRole('button', { name: /Perfect/i });
      expect(perfectTabs.length).toBeGreaterThan(0);

      const mismatchTabs = screen.getAllByRole('button', { name: /Mismatch/i });
      expect(mismatchTabs.length).toBeGreaterThan(0);

      // Switch to mismatch tab
      fireEvent.click(mismatchTabs[0]);

      // Verify chat interaction with "Ask Advisor"
      const askUnitBtns = screen.queryAllByRole('button', { name: /Ask Advisor/i });
      if (askUnitBtns.length > 0) {
        fireEvent.click(askUnitBtns[0]);
        // The chat conversation will have the dispatched advisory inquiry message
        expect(await screen.findByText(/I need your advisory evaluation for this unit/i)).toBeInTheDocument();
      }
    });

    it('triggers onShow3D and onOpenProperty when property action buttons are clicked', () => {
      const mockShow3D = vi.fn();
      const mockOpenProperty = vi.fn();

      render(
        <RealEstateAdvisor
          t={TRANSLATIONS.en}
          isRtl={false}
          properties={MOCK_TEST_PROPERTIES}
          userName="Tarek"
          onShow3D={mockShow3D}
          onOpenProperty={mockOpenProperty}
        />
      );

      // Click unit title to trigger onOpenProperty
      const unitHeading = screen.getByText('Modern New Cairo Penthouse');
      fireEvent.click(unitHeading);
      expect(mockOpenProperty).toHaveBeenCalledWith('prop-2');

      // Click 3D tour button to trigger onShow3D
      const tourButtons = screen.getAllByTitle('3D Tour');
      expect(tourButtons.length).toBeGreaterThan(0);
      fireEvent.click(tourButtons[0]);
      expect(mockShow3D).toHaveBeenCalled();
    });
  });

  describe('4. Full App Navigation to Real Estate Advisor', () => {
    it('navigates to the advisor page when advisor button in navbar is clicked', async () => {
      render(<App />);

      const advisorNavBtns = screen.getAllByRole('button', { name: new RegExp(TRANSLATIONS.en.advisor_nav, 'i') });
      expect(advisorNavBtns.length).toBeGreaterThan(0);

      fireEvent.click(advisorNavBtns[0]);

      // Verify advisor title is displayed
      expect(await screen.findByText(TRANSLATIONS.en.advisor_title)).toBeInTheDocument();
    });
  });
});
