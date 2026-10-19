// FAILYR is an Elasticsearch keyword. Quote each year so the range matches the term.
const FOUR_DIGIT_YEAR = /^\d{4}$/;

export interface BankFailureQueryInput {
  name?: string;
  state?: string;
  start_year?: string;
  end_year?: string;
  limit: number;
}

export function bankFailureQuery(input: BankFailureQueryInput): Record<string, string> {
  const filters: string[] = [];
  if (input.name) filters.push(`INSTNAME:${input.name}`);
  if (input.state) filters.push(`FAILST:${input.state}`);
  if (input.start_year || input.end_year) {
    const from = yearBound(input.start_year, "start_year");
    const to = yearBound(input.end_year, "end_year");
    filters.push(`FAILYR:[${from} TO ${to}]`);
  }
  return {
    filters: filters.join(" AND "),
    limit: String(input.limit),
    sort_by: "FAILDATE",
    sort_order: "DESC",
  };
}

function yearBound(year: string | undefined, field: "start_year" | "end_year"): string {
  if (!year) return "*";
  if (!FOUR_DIGIT_YEAR.test(year)) {
    throw new Error(`${field} must be a 4-digit year`);
  }
  return `"${year}"`;
}
