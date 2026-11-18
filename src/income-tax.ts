export interface TaxRange {
    threshold: number;
    rate: number;
}

export interface TaxConfig {
    ranges: readonly TaxRange[];
    // Plafonnement du quotient familial
    familyQuotientCap: {
        perHalfPart: number;
        // First child of a single parent, together with the single-parent half-part (case T)
        singleParentFirstChild: number;
    };
    // Décote
    discount: {
        single: number;
        couple: number;
        rate: number;
    };
    // Seuil de mise en recouvrement
    collectionThreshold: number;
}

// Impôt 2026 sur les revenus 2025
export const taxConfig: TaxConfig = {
    ranges: [
        {
            threshold: 11_600,
            rate: 0,
        },
        {
            threshold: 29_579,
            rate: 0.11,
        },
        {
            threshold: 84_577,
            rate: 0.3,
        },
        {
            threshold: 181_917,
            rate: 0.41,
        },
        {
            threshold: Number.POSITIVE_INFINITY,
            rate: 0.45,
        },
    ],
    familyQuotientCap: {
        perHalfPart: 1807,
        singleParentFirstChild: 4262,
    },
    discount: {
        single: 897,
        couple: 1483,
        rate: 0.4525,
    },
    collectionThreshold: 61,
};

/**
 * Revalorise les montants indexés (seuils, plafonds, décote) sans toucher aux taux
 */
export function reviseTaxConfig(config: TaxConfig, multiplier: number): TaxConfig {
    const revise = (amount: number) => Math.round(amount * multiplier);
    return {
        ...config,
        ranges: config.ranges.map(({threshold, rate}) => ({threshold: revise(threshold), rate})),
        familyQuotientCap: {
            perHalfPart: revise(config.familyQuotientCap.perHalfPart),
            singleParentFirstChild: revise(config.familyQuotientCap.singleParentFirstChild),
        },
        discount: {
            ...config.discount,
            single: revise(config.discount.single),
            couple: revise(config.discount.couple),
        },
    };
}

export interface Household {
    // Revenu imposable, >= 0
    income: number;
    married: boolean;
    // Enfants à charge, entier >= 0
    children: number;
}

/**
 * Builds a valid household from raw form values: empty (null), negative,
 * fractional or infinite values are brought back to a valid value
 */
export function householdFromInput(income: number | null, married: boolean, children: number | null): Household {
    return {
        income: income !== null && Number.isFinite(income) ? Math.max(0, income) : 0,
        married,
        children: children !== null && Number.isFinite(children) ? Math.max(0, Math.trunc(children)) : 0,
    };
}

export interface TaxBreakdown {
    // Nombre de parts du foyer
    parts: number;
    // Whether the family quotient benefit was capped (plafonnement)
    familyQuotientCapped: boolean;
    // Impôt brut, après quotient familial et plafonnement, avant décote
    grossTax: number;
    // Décote effectivement appliquée
    discount: number;
    tax: number;
    // false when the tax is below the collection threshold and will not be charged
    collected: boolean;
}

/**
 * Simplified French income tax: anyone unmarried with children is considered a single parent (case T)
 */
export function computeIncomeTax({income, married, children}: Household, config: TaxConfig = taxConfig): TaxBreakdown {
    const adultParts = married ? 2 : 1;
    const singleParent = !married && children > 0;
    const parts = adultParts
        + 0.5 * Math.min(children, 2)
        + Math.max(0, children - 2)
        + (singleParent ? 0.5 : 0);

    // The benefit given by the children's parts is capped: compare with the tax on the adults' parts only
    const taxWithAllParts = taxForParts(income, parts, config.ranges);
    const cappedTax = taxForParts(income, adultParts, config.ranges) - familyQuotientCap(2 * (parts - adultParts), singleParent, config);
    const grossTax = Math.max(taxWithAllParts, cappedTax);

    const discountCeiling = married ? config.discount.couple : config.discount.single;
    const discount = Math.min(grossTax, Math.max(0, discountCeiling - Math.round(config.discount.rate * grossTax)));
    const tax = grossTax - discount;

    return {
        parts,
        familyQuotientCapped: cappedTax > taxWithAllParts,
        grossTax,
        discount,
        tax,
        collected: tax >= config.collectionThreshold,
    };
}

function taxForParts(income: number, parts: number, ranges: readonly TaxRange[]): number {
    return Math.round(taxForOnePart(Math.round(income / parts), ranges) * parts);
}

// amount should not be rounded
function taxForOnePart(base: number, ranges: readonly TaxRange[]): number {
    return ranges.reduce((previousValue, range, index) => {
        const previousThreshold = ranges[index - 1]?.threshold ?? 0;
        if (base <= previousThreshold) {
            return previousValue;
        }

        return previousValue + range.rate * (Math.min(range.threshold, base) - previousThreshold);
    }, 0);
}

function familyQuotientCap(childHalfParts: number, singleParent: boolean, {familyQuotientCap: cap}: TaxConfig): number {
    if (singleParent) {
        // The first two half-parts (first child + case T) share a specific cap
        return cap.singleParentFirstChild + (childHalfParts - 2) * cap.perHalfPart;
    }
    return childHalfParts * cap.perHalfPart;
}
