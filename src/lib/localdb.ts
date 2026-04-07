import Dexie, { type Table } from "dexie";

export type Role = "admin" | "salesman";

export type LocalUser = {
  id: string;
  email: string;
  password: string; // simple local password (no hashing in MVP)
  role: Role;
  full_name?: string;
  created_at: string;
};

export type AgentRow = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  opening_balance_sar: number;
  created_at: string;
  updated_at: string;
};

export type SalesmanRow = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SaleRow = {
  id: string;
  sale_date: string;
  customer_name: string;
  customer_mobile?: string;
  ticket_number?: string;
  route?: string;
  passenger_name?: string;
  agent_id?: string;
  salesman_id?: string;
  sell_amount_sar: number;
  cost_amount_sar: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type LedgerDirection = "customer_in" | "agent_out" | "agent_credit";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "credit";

export type LedgerRow = {
  id: string;
  entry_date: string;
  direction: LedgerDirection;
  method: PaymentMethod;
  sale_id?: string;
  agent_id?: string;
  amount_sar: number;
  reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

class NasBillingDB extends Dexie {
  users!: Table<LocalUser, string>;
  agents!: Table<AgentRow, string>;
  salesmen!: Table<SalesmanRow, string>;
  sales!: Table<SaleRow, string>;
  ledger!: Table<LedgerRow, string>;

  constructor() {
    super("nas_travels_billing");

    this.version(1).stores({
      users: "id, email, role",
      agents: "id, name",
      salesmen: "id, name, active",
      sales: "id, sale_date, customer_name, ticket_number, customer_mobile, agent_id, salesman_id",
      ledger: "id, entry_date, direction, method, agent_id, sale_id",
    });
  }
}

export const db = new NasBillingDB();

export function nowIso() {
  return new Date().toISOString();
}
