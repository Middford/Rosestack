CREATE TYPE "public"."agent_trigger" AS ENUM('manual', 'daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."battery_chemistry" AS ENUM('LFP', 'NMC', 'NaIon', 'Other');--> statement-breakpoint
CREATE TYPE "public"."capture_status" AS ENUM('not-started', 'researching', 'in-progress', 'captured', 'missed');--> statement-breakpoint
CREATE TYPE "public"."constraint_status" AS ENUM('unconstrained', 'approaching', 'constrained');--> statement-breakpoint
CREATE TYPE "public"."home_status" AS ENUM('prospect', 'qualified', 'contracted', 'installed', 'live', 'churned');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('referral', 'door-knock', 'website', 'club', 'social', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'proposal-sent', 'contracted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."mitigation_status" AS ENUM('not-started', 'in-progress', 'implemented', 'tested');--> statement-breakpoint
CREATE TYPE "public"."opportunity_category" AS ENUM('hardware-cost', 'revenue-enhancement', 'grid-flexibility', 'policy-tailwind', 'business-model', 'competitive-advantage');--> statement-breakpoint
CREATE TYPE "public"."phase_type" AS ENUM('1-phase', '3-phase');--> statement-breakpoint
CREATE TYPE "public"."pipeline_status" AS ENUM('new_lead', 'initial_contact', 'interested', 'property_assessed', 'visit_scheduled', 'visit_complete', 'proposal_prepared', 'proposal_sent', 'proposal_reviewing', 'verbal_agreement', 'contract_sent', 'contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned', 'live', 'on_hold', 'lost');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('detached', 'semi', 'terrace', 'bungalow', 'farm', 'commercial');--> statement-breakpoint
CREATE TYPE "public"."risk_category" AS ENUM('tariff', 'energy-market', 'regulatory', 'technology', 'operational', 'financial', 'competitive');--> statement-breakpoint
CREATE TYPE "public"."scenario_type" AS ENUM('best', 'likely', 'worst');--> statement-breakpoint
CREATE TYPE "public"."tariff_type" AS ENUM('fixed', 'variable', 'agile', 'flux', 'time-of-use');--> statement-breakpoint
CREATE TABLE "agent_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"module" varchar(100) NOT NULL,
	"trigger" "agent_trigger" NOT NULL,
	"system_prompt" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agile_ingestion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"product_code" varchar(50) NOT NULL,
	"type" varchar(10) NOT NULL,
	"total_slots" integer DEFAULT 0,
	"inserted_slots" integer DEFAULT 0,
	"skipped_slots" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agile_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(10) NOT NULL,
	"product_code" varchar(50),
	"valid_from" varchar(30) NOT NULL,
	"valid_to" varchar(30) NOT NULL,
	"value_inc_vat" real NOT NULL,
	"region" varchar(5) DEFAULT 'N' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backtest_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"params" jsonb NOT NULL,
	"phase_type" varchar(10) NOT NULL,
	"total_capacity_kwh" real NOT NULL,
	"total_inverter_kw" real NOT NULL,
	"solar_kwp" real DEFAULT 0,
	"export_limit_kw" real NOT NULL,
	"total_capex_gbp" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backtest_daily_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"tariff" varchar(10) DEFAULT 'agile' NOT NULL,
	"total_charge_kwh" real NOT NULL,
	"total_discharge_kwh" real NOT NULL,
	"total_import_cost_pence" real NOT NULL,
	"total_export_revenue_pence" real NOT NULL,
	"net_revenue_pence" real NOT NULL,
	"cycles_completed" real,
	"profitable_export_slots" integer,
	"zero_cost_charge_slots" integer,
	"end_of_day_soc" real,
	"export_source" varchar(20) DEFAULT 'agile_outgoing',
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backtest_monthly_comparison" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"years_averaged" integer NOT NULL,
	"agile_avg_daily_pence" real NOT NULL,
	"agile_avg_export_slots" real,
	"agile_avg_zero_cost_slots" real,
	"iof_avg_daily_pence" real NOT NULL,
	"iof_max_daily_discharge_kwh" real,
	"best_tariff" varchar(10) NOT NULL,
	"agile_delta_pence" real NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battery_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid,
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
--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"reference_number" varchar(200),
	"submitted_date" timestamp,
	"approved_date" timestamp,
	"expiry_date" timestamp,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumption_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"inputs" jsonb NOT NULL,
	"matrix_flat" jsonb NOT NULL,
	"annual_total_kwh" real NOT NULL,
	"monthly_totals" jsonb NOT NULL,
	"solar_gen_kwh_annual" real,
	"peak_demand_kw" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"predicted_revenue_pence_likely" real NOT NULL,
	"predicted_revenue_pence_best" real NOT NULL,
	"predicted_revenue_pence_worst" real NOT NULL,
	"optimal_tariff" varchar(10) NOT NULL,
	"seasonal_index" real,
	"effective_capacity_kwh" real,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"dispatch_date" varchar(10) NOT NULL,
	"total_charge_kwh" real,
	"total_discharge_kwh" real,
	"total_import_cost_pence" real,
	"total_export_revenue_pence" real,
	"net_revenue_pence" real,
	"cycles_completed" real,
	"saving_session_revenue_pence" real DEFAULT 0,
	"agile_import_rate_source" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"slot_date" varchar(10) NOT NULL,
	"slot_index" integer NOT NULL,
	"import_rate_pence" real,
	"export_rate_pence" real,
	"action" varchar(30) NOT NULL,
	"soc_start" real,
	"soc_end" real,
	"energy_kwh" real,
	"revenue_pence" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"system_config_id" uuid,
	"tariff_id" uuid,
	"scenario_type" "scenario_type" NOT NULL,
	"assumptions" jsonb NOT NULL,
	"projections" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_catalogue" (
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
--> statement-breakpoint
CREATE TABLE "homes" (
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
	"bedrooms" integer,
	"floor_area_sqm" real,
	"built_year" integer,
	"heating_type" varchar(50),
	"export_limit_kw" real,
	"secondary_transformer_id" uuid,
	"property_score" integer,
	"g99_probability" real,
	"consumption_kwh_per_year" real,
	"solar_kwp" real,
	"referral_source" varchar(200),
	"data_source" varchar(100) DEFAULT 'Modelled Estimate' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid,
	"name" varchar(200) NOT NULL,
	"phone" varchar(20),
	"email" varchar(200),
	"source" "lead_source" NOT NULL,
	"referred_by" varchar(200),
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"notes" jsonb DEFAULT '[]'::jsonb,
	"pipeline_status" "pipeline_status" DEFAULT 'new_lead',
	"g99_submitted_date" timestamp,
	"g99_approved_date" timestamp,
	"contract_signed_date" timestamp,
	"install_date" timestamp,
	"commissioned_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_register" (
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
--> statement-breakpoint
CREATE TABLE "optimiser_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_type" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"config_grid" jsonb,
	"best_config" jsonb,
	"best_npv_10yr" real,
	"diminishing_returns_at_stack" integer,
	"optimal_switching_revenue_pence" real,
	"switching_calendar" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50),
	"notes" text,
	"performed_by" varchar(100),
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"event" varchar(200) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_actuals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"calendar_month" integer NOT NULL,
	"calendar_year" integer NOT NULL,
	"arbitrage_revenue_gbp" real,
	"saving_sessions_revenue_gbp" real,
	"flexibility_revenue_gbp" real,
	"solar_revenue_gbp" real,
	"seg_revenue_gbp" real,
	"total_revenue_gbp" real NOT NULL,
	"costs_gbp" real NOT NULL,
	"net_revenue_gbp" real NOT NULL,
	"cumulative_net_gbp" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_register" (
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
--> statement-breakpoint
CREATE TABLE "secondary_transformers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_substation_id" uuid,
	"name" varchar(200) NOT NULL,
	"dno_ref" varchar(100),
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"rating_kva" real,
	"current_load_percent" real,
	"connected_premises" integer,
	"lv_feeder_count" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "street_intelligence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transformer_id" uuid,
	"postcode" varchar(10) NOT NULL,
	"street_name" varchar(300),
	"premise_count" integer,
	"three_phase_estimate" integer,
	"rose_stack_homes" integer DEFAULT 0,
	"avg_property_age" integer,
	"avg_epc_rating" varchar(5),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "substations" (
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
	"data_source" varchar(100) DEFAULT 'Modelled Estimate' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tariff_name" varchar(200) NOT NULL,
	"supplier" varchar(100) NOT NULL,
	"status" varchar(30) NOT NULL,
	"pause_reason" text,
	"available_from" timestamp,
	"available_to" timestamp,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_comparison" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"sweep_date" timestamp DEFAULT now() NOT NULL,
	"current_tariff" varchar(200) NOT NULL,
	"recommended_tariff" varchar(200),
	"current_annual_revenue_likely" real,
	"recommended_annual_revenue_likely" real,
	"uplift_percent" real,
	"status" varchar(30) DEFAULT 'pending',
	"approved_by" varchar(100),
	"switched_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"tariff_code" varchar(200) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp,
	"value_exc_vat" real NOT NULL,
	"value_inc_vat" real NOT NULL,
	"region" varchar(5) DEFAULT 'G' NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tariff_name" varchar(50) NOT NULL,
	"region" varchar(5) DEFAULT 'G' NOT NULL,
	"off_peak_import" real,
	"day_import" real,
	"peak_import" real,
	"off_peak_export" real,
	"day_export" real,
	"peak_export" real,
	"standing_charge" real,
	"spread" real,
	"valid_from" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariffs" (
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
--> statement-breakpoint
ALTER TABLE "agent_outputs" ADD CONSTRAINT "agent_outputs_agent_id_agent_configs_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtest_daily_results" ADD CONSTRAINT "backtest_daily_results_config_id_backtest_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."backtest_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtest_monthly_comparison" ADD CONSTRAINT "backtest_monthly_comparison_config_id_backtest_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."backtest_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battery_systems" ADD CONSTRAINT "battery_systems_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumption_profiles" ADD CONSTRAINT "consumption_profiles_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_predictions" ADD CONSTRAINT "daily_predictions_config_id_backtest_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."backtest_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_daily" ADD CONSTRAINT "dispatch_daily_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_slots" ADD CONSTRAINT "dispatch_slots_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_scenarios" ADD CONSTRAINT "financial_scenarios_system_config_id_battery_systems_id_fk" FOREIGN KEY ("system_config_id") REFERENCES "public"."battery_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_scenarios" ADD CONSTRAINT "financial_scenarios_tariff_id_tariffs_id_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariffs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_timeline" ADD CONSTRAINT "property_timeline_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_actuals" ADD CONSTRAINT "revenue_actuals_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secondary_transformers" ADD CONSTRAINT "secondary_transformers_primary_substation_id_substations_id_fk" FOREIGN KEY ("primary_substation_id") REFERENCES "public"."substations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "street_intelligence" ADD CONSTRAINT "street_intelligence_transformer_id_secondary_transformers_id_fk" FOREIGN KEY ("transformer_id") REFERENCES "public"."secondary_transformers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_comparison" ADD CONSTRAINT "tariff_comparison_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agile_rates_slot_uniq" ON "agile_rates" USING btree ("type","valid_from","region");--> statement-breakpoint
CREATE UNIQUE INDEX "backtest_daily_uniq" ON "backtest_daily_results" USING btree ("config_id","date","tariff");--> statement-breakpoint
CREATE UNIQUE INDEX "backtest_monthly_uniq" ON "backtest_monthly_comparison" USING btree ("config_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_predictions_uniq" ON "daily_predictions" USING btree ("config_id","date");