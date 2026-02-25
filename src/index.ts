#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "mcp-fdic", version: "1.0.0" });
const BASE = "https://banks.data.fdic.gov/api";

async function fdic(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FDIC API ${res.status}: ${await res.text()}`);
  return res.json();
}

server.tool("search_institutions", "Search FDIC-insured financial institutions", {
  name: z.string().optional().describe("Institution name"),
  state: z.string().optional().describe("Two-letter state code"),
  city: z.string().optional(),
  zip: z.string().optional(),
  active: z.boolean().default(true).describe("Only active institutions"),
  limit: z.number().default(10),
}, async ({ name, state, city, zip, active, limit }) => {
  const filters: string[] = [];
  if (name) filters.push(`INSTNAME:${name}`);
  if (state) filters.push(`STALP:${state}`);
  if (city) filters.push(`CITY:${city}`);
  if (zip) filters.push(`ZIP:${zip}`);
  if (active) filters.push("ACTIVE:1");
  const data = await fdic("/financials", {
    filters: filters.join(" AND "),
    limit: String(limit),
    sort_by: "ASSET",
    sort_order: "DESC",
    fields: "INSTNAME,CERT,STALP,CITY,ASSET,DEP,NETINC,ROA,ROE,ACTIVE",
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("institution_detail", "Get detailed info for an FDIC-insured institution", {
  cert: z.string().describe("FDIC Certificate Number"),
}, async ({ cert }) => {
  const data = await fdic("/financials", {
    filters: `CERT:${cert}`,
    limit: "1",
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("bank_failures", "Search FDIC bank failure history", {
  name: z.string().optional(),
  state: z.string().optional(),
  start_year: z.string().optional(),
  end_year: z.string().optional(),
  limit: z.number().default(10),
}, async ({ name, state, start_year, end_year, limit }) => {
  const filters: string[] = [];
  if (name) filters.push(`INSTNAME:${name}`);
  if (state) filters.push(`FAILST:${state}`);
  const data = await fdic("/failures", {
    filters: filters.join(" AND "),
    limit: String(limit),
    sort_by: "FAILDATE",
    sort_order: "DESC",
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("branch_search", "Search bank branch locations", {
  institution_name: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  limit: z.number().default(10),
}, async ({ institution_name, state, city, zip, limit }) => {
  const filters: string[] = [];
  if (institution_name) filters.push(`INSTNAME:${institution_name}`);
  if (state) filters.push(`STALP:${state}`);
  if (city) filters.push(`CITY:${city}`);
  if (zip) filters.push(`ZIP:${zip}`);
  const data = await fdic("/locations", {
    filters: filters.join(" AND "),
    limit: String(limit),
    fields: "INSTNAME,OFFNAME,STALP,CITY,ZIP,ADDRESS,SERVTYPE",
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("financial_summary", "Get financial summary for an institution", {
  cert: z.string().describe("FDIC Certificate Number"),
  date: z.string().optional().describe("Report date (YYYYMMDD)"),
}, async ({ cert, date }) => {
  const filters = `CERT:${cert}`;
  const data = await fdic("/financials", {
    filters: date ? `${filters} AND REPDTE:${date}` : filters,
    limit: "1",
    fields: "INSTNAME,CERT,REPDTE,ASSET,DEP,NETINC,ROA,ROE,EQTOT,LNLSNET,INTINC,NITEFDS",
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
