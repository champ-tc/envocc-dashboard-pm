export const DDS_DIAGNOSIS_TYPES = {
    lawWithZ581: 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1',
    lawWithZ581AndY97: 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1+Y97',
    customWithZ581: 'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ',
} as const;

export function getRequiredDiagnosisCodes(diagnosisType: string | undefined, lawCodes: string[]): string[] {
    const normalizedLawCodes = Array.from(new Set(lawCodes.map((code) => code.replace(/\./g, '').toUpperCase())))
        .filter((code) => code !== 'Z581' && code !== 'Y97');

    if (diagnosisType === DDS_DIAGNOSIS_TYPES.lawWithZ581) {
        return ['Z581', ...normalizedLawCodes];
    }

    if (diagnosisType === DDS_DIAGNOSIS_TYPES.lawWithZ581AndY97) {
        return ['Z581', 'Y97', ...normalizedLawCodes];
    }

    if (diagnosisType === DDS_DIAGNOSIS_TYPES.customWithZ581) {
        return ['Z581'];
    }

    return [];
}

/** Codes that should contribute to diagnosis totals after a person matches a mode. */
export function getCountedDiagnosisCodes(diagnosisType: string | undefined, codes: string[]): string[] {
    const normalizedCodes = Array.from(new Set(codes.map((code) => code.replace(/\./g, '').toUpperCase())));

    if (diagnosisType === DDS_DIAGNOSIS_TYPES.lawWithZ581 || diagnosisType === DDS_DIAGNOSIS_TYPES.lawWithZ581AndY97) {
        return normalizedCodes.filter((code) => code !== 'Z581' && code !== 'Y97');
    }

    return normalizedCodes;
}

export function buildDiagnosisHaving(requiredAllCodes: string[], anyOfCodes: string[] = [], column = 'icd10_code'): string {
    const normalizedColumn = `REPLACE(UPPER(TRIM(${column})), '.', '')`;
    const allPredicates = requiredAllCodes
        .map((code) => `COUNT(*) FILTER (WHERE ${normalizedColumn} = '${code}') > 0`)
        .join('\n                        AND ');
    const anyPredicate = anyOfCodes.length > 0
        ? `(${anyOfCodes.map((code) => `COUNT(*) FILTER (WHERE ${normalizedColumn} LIKE '${code}%') > 0`).join(' OR ')})`
        : '';

    return [allPredicates, anyPredicate].filter(Boolean).join('\n                        AND ');
}
