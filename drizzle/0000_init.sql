CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"job_title" text NOT NULL,
	"category_id" uuid NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"work_mode" text DEFAULT 'not_specified' NOT NULL,
	"employment_type" text DEFAULT 'full_time' NOT NULL,
	"job_url" text DEFAULT '' NOT NULL,
	"job_description" text DEFAULT '' NOT NULL,
	"application_date" date,
	"closing_date" date,
	"source" text DEFAULT 'other' NOT NULL,
	"stage" text DEFAULT 'applied' NOT NULL,
	"follow_up_date" date,
	"notes" text DEFAULT '' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_work_mode_check" CHECK ("applications"."work_mode" in ('on_site', 'hybrid', 'remote', 'not_specified')),
	CONSTRAINT "applications_employment_type_check" CHECK ("applications"."employment_type" in ('full_time', 'part_time', 'contract', 'casual', 'internship', 'other')),
	CONSTRAINT "applications_source_check" CHECK ("applications"."source" in ('linkedin', 'seek', 'trade_me', 'company_website', 'recruiter', 'referral', 'other')),
	CONSTRAINT "applications_stage_check" CHECK ("applications"."stage" in ('applied', 'phone_screen', 'online_assessment', 'first_interview', 'second_interview', 'technical_interview', 'reference_check', 'offer', 'rejected', 'withdrawn', 'no_response', 'position_closed'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"type" text NOT NULL,
	"date" date NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	CONSTRAINT "events_type_check" CHECK ("events"."type" in ('phone_screen', 'online_assessment', 'interview', 'technical_interview', 'other'))
);
--> statement-breakpoint
CREATE TABLE "stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "stage_history_from_stage_check" CHECK ("stage_history"."from_stage" is null or "stage_history"."from_stage" in ('applied', 'phone_screen', 'online_assessment', 'first_interview', 'second_interview', 'technical_interview', 'reference_check', 'offer', 'rejected', 'withdrawn', 'no_response', 'position_closed')),
	CONSTRAINT "stage_history_to_stage_check" CHECK ("stage_history"."to_stage" in ('applied', 'phone_screen', 'online_assessment', 'first_interview', 'second_interview', 'technical_interview', 'reference_check', 'offer', 'rejected', 'withdrawn', 'no_response', 'position_closed'))
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_history" ADD CONSTRAINT "stage_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_category_idx" ON "applications" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "applications_stage_idx" ON "applications" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "applications_application_date_idx" ON "applications" USING btree ("application_date");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_lower_idx" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "events_application_idx" ON "events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "stage_history_application_idx" ON "stage_history" USING btree ("application_id");