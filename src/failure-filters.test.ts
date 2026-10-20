import assert from "node:assert/strict";
import test from "node:test";
import { bankFailureQuery } from "./failure-filters.js";

test("disjoint year ranges produce different FDIC parameters", () => {
  const early = bankFailureQuery({ start_year: "2000", end_year: "2001", limit: 10 });
  const late = bankFailureQuery({ start_year: "2010", end_year: "2011", limit: 10 });
  assert.notDeepEqual(early, late);
  assert.equal(early.filters, 'FAILYR:["2000" TO "2001"]');
  assert.equal(late.filters, 'FAILYR:["2010" TO "2011"]');
  assert.equal(early.limit, "10");
  assert.equal(early.sort_by, "FAILDATE");
  assert.equal(early.sort_order, "DESC");
});

test("a single bound stays open on the other side", () => {
  assert.equal(
    bankFailureQuery({ start_year: "2008", limit: 10 }).filters,
    'FAILYR:["2008" TO *]',
  );
  assert.equal(
    bankFailureQuery({ end_year: "2012", limit: 10 }).filters,
    'FAILYR:[* TO "2012"]',
  );
});

test("omitted years leave the existing name and state filters unchanged", () => {
  assert.deepEqual(bankFailureQuery({ name: "Acme", state: "TX", limit: 5 }), {
    filters: "INSTNAME:Acme AND FAILST:TX",
    limit: "5",
    sort_by: "FAILDATE",
    sort_order: "DESC",
  });
});

test("year bounds are combined with name and state", () => {
  assert.equal(
    bankFailureQuery({
      name: "Acme",
      state: "TX",
      start_year: "2008",
      end_year: "2010",
      limit: 5,
    }).filters,
    'INSTNAME:Acme AND FAILST:TX AND FAILYR:["2008" TO "2010"]',
  );
});

test("a non-year bound is rejected instead of dropped", () => {
  assert.throws(
    () => bankFailureQuery({ start_year: "2008 OR FAILYR:*", limit: 10 }),
    /start_year must be a 4-digit year/,
  );
  assert.throws(
    () => bankFailureQuery({ end_year: "10", limit: 10 }),
    /end_year must be a 4-digit year/,
  );
});
