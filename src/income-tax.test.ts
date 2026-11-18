import { describe, expect, it } from 'vitest';
import { computeIncomeTax, householdFromInput, reviseTaxConfig, taxConfig } from './income-tax';

describe('computeIncomeTax', () => {
    it.each([
        // income, married, children, expected breakdown
        [30_000, false, 0, {parts: 1, familyQuotientCapped: false, grossTax: 2104, discount: 0, tax: 2104, collected: true}],
        [20_000, false, 0, {parts: 1, familyQuotientCapped: false, grossTax: 924, discount: 479, tax: 445, collected: true}],
        [17_400, false, 0, {parts: 1, familyQuotientCapped: false, grossTax: 638, discount: 608, tax: 30, collected: false}],
        [30_000, true, 2, {parts: 3, familyQuotientCapped: false, grossTax: 0, discount: 0, tax: 0, collected: false}],
        [50_000, false, 1, {parts: 2, familyQuotientCapped: true, grossTax: 3842, discount: 0, tax: 3842, collected: true}],
        [50_000, true, 1, {parts: 2.5, familyQuotientCapped: false, grossTax: 2310, discount: 438, tax: 1872, collected: true}],
        [120_000, true, 1, {parts: 2.5, familyQuotientCapped: true, grossTax: 20_401, discount: 0, tax: 20_401, collected: true}],
        [100_000, true, 3, {parts: 4, familyQuotientCapped: true, grossTax: 8980, discount: 0, tax: 8980, collected: true}],
        [200_000, false, 1, {parts: 2, familyQuotientCapped: true, grossTax: 62_262, discount: 0, tax: 62_262, collected: true}],
    ])('income %d, married %s, %d children', (income, married, children, expected) => {
        expect(computeIncomeTax({income, married, children})).toEqual(expected);
    });

    it('uses the given config', () => {
        const revised = reviseTaxConfig(taxConfig, 1.02);
        expect(computeIncomeTax({income: 30_000, married: false, children: 0}, revised)).toMatchObject({grossTax: 1998, discount: 11, tax: 1987});
    });
});

describe('householdFromInput', () => {
    it('keeps valid values', () => {
        expect(householdFromInput(30_000, true, 2)).toEqual({income: 30_000, married: true, children: 2});
    });

    it('brings invalid values back to valid ones', () => {
        expect(householdFromInput(null, false, null)).toEqual({income: 0, married: false, children: 0});
        expect(householdFromInput(-10_000, false, -1)).toEqual({income: 0, married: false, children: 0});
        expect(householdFromInput(Number.POSITIVE_INFINITY, false, Number.NaN)).toEqual({income: 0, married: false, children: 0});
        expect(householdFromInput(30_000, false, 1.5).children).toBe(1);
    });
});

describe('reviseTaxConfig', () => {
    it('revises indexed amounts only', () => {
        const revised = reviseTaxConfig(taxConfig, 1.02);
        expect(revised.ranges.map(r => r.threshold)).toEqual([11_832, 30_171, 86_269, 185_555, Number.POSITIVE_INFINITY]);
        expect(revised.ranges.map(r => r.rate)).toEqual(taxConfig.ranges.map(r => r.rate));
        expect(revised.familyQuotientCap).toEqual({perHalfPart: 1843, singleParentFirstChild: 4347});
        expect(revised.discount).toEqual({single: 915, couple: 1513, rate: 0.4525});
        expect(revised.collectionThreshold).toBe(61);
    });
});
