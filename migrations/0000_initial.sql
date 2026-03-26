-- ============================================================
-- RoseStack Platform — Initial Schema Migration
-- Generated from src/shared/db/schema.ts
-- Run via: npm run db:migrate  (requires DATABASE_URL in .env.local)
-- ============================================================

-- Enums
CREATE TYPE "home_status" AS ENUM ('prospect', 'qualified', 'contracted', 'installed', 'live', 'churned');
CREATE TYPE "phase_type" AS ENUM ('1-phase', '3-phase');
CREATE TYPE "property_type" AS ENUM ('detached', 'semi', 'terrace', 'bungalow', 'farm', 'commercial');
CREATE TYPE "battery_chemistry" AS ENUM ('LFP', 'NMC', 'NaIon', 'Other');
CREATE TYPE "tariff_type" AS ENUM ('fixed', 'variable', 'agile', 'flux', 'time-of-use');
CREATE TYPE "constraint_status" AS ENUM ('unconstrained', 'approaching', 'constrained');
CREATE TYPE "lead_source" AS ENUM ('referral', 'door-knock', 'website', 'club', 'social', 'other');
CREATE TYPE "lead_status" AS ENUM ('new', 'contacted', 'qualified', 'proposal-sent', 'contracted', 'lost');
CREATE TYPE "scenario_type" AS ENUM ('best', 'likely', 'worst');
CREATE TYPE "risk_category" AS ENUM ('tariff', 'energy-market', 'regulatory', 'technology', 'operational', 'financial', 'competitive');
CREATE TYPE "opportunity_category" AS ENUM ('hardware-cost', 'revenue-enhancement', 'grid-flexibility', 'policy-tailwind', 'business-model', 'competitive-advantage');
CREATE TYPE "mitigation_status" AS ENUM ('not-started', 'in-progress', 'implemented', 'tested');
CREATE TYPE "capture_status" AS ENUM ('not-started', 'researching', 'in-progress', 'captured', 'missed');
CREATE TYPE "agent_trigger" AS ENUM ('manual', 'daily', 'weekly', 'monthly');

-- Tables

CREATE TABLE IF NOT EXISTS "homes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "address" varchar(500) NOT NULL,
  "postcode" varchar(10) NOT NULL,
  "latitude" real NOT NULL,
  "longitude" real NOT NULL,
  "phase" "phase_type" NOT NULL,
  "substation_id" uuid,
  "system_id" uuid,
  "homeowner_id" uuid,
  "status" "home_status" DEFAULT 'prospect' NOT NULL,
  "epc_rating" varchar(5),
  "property_type" "property_type",
  "garden_access" boolean,
  "install_date" timestamp,
  "contract_end_date" timestamp,
  "monthly_homeowner_payment" real,
  "esa_contract_ref" varchar(100),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "battery_systems" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "home_id" uuid REFERENCES "homes"("id"),
  "inverter_model" varchar(200) NOT NULL,
  "battery_modules" integer NOT NULL,
  "total_capacity_kwh" real NOT NULL,
  "battery_chemistry" "battery_chemistry" NOT NULL,
  "solar_pv_kwp" real,
  "heat_pump_model" varchar(200),
  "install_cost" real NOT NULL,
  "annual_maintenance_cost" real NOT NULL,
  "warranty_years" integer NOT NULL,
  "degradation_rate_percent" real NOT NULL,
  "max_charge_rate_kw" real NOT NULL,
  "max_discharge_rate_kw" real NOT NULL,
  "round_trip_efficiency" real NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tariffs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "supplier" varchar(200) NOT NULL,
  "name" varchar(200) NOT NULL,
  "type" "tariff_type" NOT NULL,
  "import_rates" jsonb NOT NULL,
  "export_rates" jsonb NOT NULL,
  "standing_charge_pence_per_day" real NOT NULL,
  "valid_from" timestamp NOT NULL,
  "valid_to" timestamp,
  "eligibility_requirements" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "substations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(300) NOT NULL,
  "dno_region" varchar(100) NOT NULL,
  "latitude" real NOT NULL,
  "longitude" real NOT NULL,
  "capacity_mva" real,
  "current_load_percent" real,
  "constraint_status" "constraint_status" DEFAULT 'unconstrained' NOT NULL,
  "flexibility_tender_active" boolean DEFAULT false NOT NULL,
  "connected_homes" integer,
  "max_new_connections" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "home_id" uuid REFERENCES "homes"("id"),
  "name" varchar(200) NOT NULL,
  "phone" varchar(20),
  "email" varchar(200),
  "source" "lead_source" NOT NULL,
  "referred_by" varchar(200),
  "status" "lead_status" DEFAULT 'new' NOT NULL,
  "notes" jsonb DEFAULT '[]',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "financial_scenarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL,
  "system_config_id" uuid REFERENCES "battery_systems"("id"),
  "tariff_id" uuid REFERENCES "tariffs"("id"),
  "scenario_type" "scenario_type" NOT NULL,
  "assumptions" jsonb NOT NULL,
  "projections" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "hardware_catalogue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category" varchar(50) NOT NULL,
  "manufacturer" varchar(200) NOT NULL,
  "model" varchar(300) NOT NULL,
  "specs" jsonb NOT NULL,
  "price_gbp" real,
  "mcs_certified" boolean DEFAULT false,
  "iof_compatible" boolean DEFAULT false,
  "three_phase_support" boolean DEFAULT false,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "risk_register" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(300) NOT NULL,
  "category" "risk_category" NOT NULL,
  "description" text NOT NULL,
  "probability" integer NOT NULL,
  "impact" integer NOT NULL,
  "score" integer NOT NULL,
  "mitigation_strategy" text NOT NULL,
  "mitigation_owner" varchar(100) NOT NULL,
  "mitigation_status" "mitigation_status" DEFAULT 'not-started' NOT NULL,
  "residual_score" integer,
  "trigger_threshold" text,
  "contingency_plan" text,
  "last_reviewed" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "opportunity_register" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(300) NOT NULL,
  "category" "opportunity_category" NOT NULL,
  "description" text NOT NULL,
  "probability" integer NOT NULL,
  "impact" integer NOT NULL,
  "score" integer NOT NULL,
  "capture_strategy" text NOT NULL,
  "capture_owner" varchar(100) NOT NULL,
  "capture_status" "capture_status" DEFAULT 'not-started' NOT NULL,
  "expected_value" real,
  "trigger_threshold" text,
  "dependencies" jsonb,
  "investment_required" text,
  "last_reviewed" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "agent_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL,
  "module" varchar(100) NOT NULL,
  "trigger" "agent_trigger" NOT NULL,
  "system_prompt" text NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "agent_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL REFERENCES "agent_configs"("id"),
  "content" text NOT NULL,
  "citations" jsonb DEFAULT '[]',
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "compliance_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "home_id" uuid REFERENCES "homes"("id"),
  "type" varchar(50) NOT NULL,
  "status" varchar(50) NOT NULL,
  "reference_number" varchar(200),
  "submitted_date" timestamp,
  "approved_date" timestamp,
  "expiry_date" timestamp,
  "documents" jsonb DEFAULT '[]',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "property_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "home_id" uuid NOT NULL REFERENCES "homes"("id"),
  "event" varchar(200) NOT NULL,
  "description" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
