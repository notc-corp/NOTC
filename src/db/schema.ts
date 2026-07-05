import { pgTable, text, integer, real, boolean, serial } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoPath: text("logo_path"),
  primaryColor: text("primary_color").default("#d97706"),
  telegramChatId: text("telegram_chat_id"),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
  isActive: boolean("is_active").notNull().default(true),
  // Billing
  trialEndsAt: text("trial_ends_at"),
  subscriptionStatus: text("subscription_status").notNull().default("trial"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  planName: text("plan_name").notNull().default("trial"),
});

export const trucks = pgTable("trucks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  number: text("number").notNull().unique(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  vin: text("vin"),
  licensePlate: text("license_plate"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  username: text("username").unique(),
  role: text("role", { enum: ["owner", "driver"] }).notNull(),
  pinHash: text("pin_hash").notNull(),
  truckNumber: text("truck_number"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  lockLevel: integer("lock_level").notNull().default(0),
  autoLogoutMidnight: boolean("auto_logout_midnight").notNull().default(true),
  ledgerEnabled: boolean("ledger_enabled").notNull().default(false),
  ledgerFeePercent: real("ledger_fee_percent").notNull().default(12),
  preTripInspectionEnabled: boolean("pre_trip_inspection_enabled").notNull().default(true),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  truckId: integer("truck_id").references(() => trucks.id),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull().default("active"),
  startOdometer: real("start_odometer"),
  endOdometer: real("end_odometer"),
  startPhotoPath: text("start_photo_path"),
  endPhotoPath: text("end_photo_path"),
  startOcrRaw: text("start_ocr_raw"),
  endOcrRaw: text("end_ocr_raw"),
  startOcrConfidence: real("start_ocr_confidence"),
  endOcrConfidence: real("end_ocr_confidence"),
  startedAt: text("started_at").notNull().$default(() => new Date().toISOString()),
  endedAt: text("ended_at"),
  notes: text("notes"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  tripId: integer("trip_id").references(() => trips.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  category: text("category", {
    enum: ["fuel", "tolls", "maintenance", "food", "other"],
  }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  description: text("description"),
  receiptPath: text("receipt_path"),
  gallons: real("gallons"),
  pricePerGallonCents: integer("price_per_gallon_cents"),
  fuelTotalCents: integer("fuel_total_cents"),
  stationName: text("station_name"),
  ocrRaw: text("ocr_raw"),
  ocrConfidence: real("ocr_confidence"),
  isManuallyEdited: boolean("is_manually_edited").notNull().default(false),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
});

export const auditReports = pgTable("audit_reports", {
  id: serial("id").primaryKey(),
  reportDate: text("report_date").notNull(),
  generatedAt: text("generated_at").notNull().$default(() => new Date().toISOString()),
  reportJson: text("report_json").notNull(),
  anomalyCount: integer("anomaly_count").notNull().default(0),
});

export const anomalies = pgTable("anomalies", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => auditReports.id),
  tripId: integer("trip_id").references(() => trips.id),
  expenseId: integer("expense_id").references(() => expenses.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: text("resolved_at"),
});

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  tripId: integer("trip_id").references(() => trips.id),
  type: text("type", { enum: ["pre", "post"] }).notNull(),
  safeToOperate: boolean("safe_to_operate"),
  hasDefects: boolean("has_defects").notNull().default(false),
  hasOutOfService: boolean("has_out_of_service").notNull().default(false),
  completedAt: text("completed_at").notNull().$default(() => new Date().toISOString()),
});

export const inspectionItems = pgTable("inspection_items", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id),
  category: text("category").notNull(),
  item: text("item").notNull(),
  status: text("status", { enum: ["ok", "defect", "na"] }).notNull().default("ok"),
  notes: text("notes"),
});

export const defects = pgTable("defects", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  tripId: integer("trip_id").references(() => trips.id),
  inspectionId: integer("inspection_id").references(() => inspections.id),
  description: text("description").notNull(),
  severity: text("severity", { enum: ["minor", "major", "out_of_service"] }).notNull(),
  photoPath: text("photo_path"),
  resolvedAt: text("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
});

export const downtimeEvents = pgTable("downtime_events", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  tripId: integer("trip_id").references(() => trips.id),
  defectId: integer("defect_id").references(() => defects.id),
  reason: text("reason"),
  startedAt: text("started_at").notNull().$default(() => new Date().toISOString()),
  endedAt: text("ended_at"),
});

export const defectNotes = pgTable("defect_notes", {
  id: serial("id").primaryKey(),
  defectId: integer("defect_id").notNull().references(() => defects.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const tripLocations = pgTable("trip_locations", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  speed: real("speed"),
  heading: real("heading"),
  accuracy: real("accuracy"),
  recordedAt: text("recorded_at").notNull().$default(() => new Date().toISOString()),
});

export const salaryRates = pgTable("salary_rates", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  type: text("type", { enum: ["hourly", "per_ton"] }).notNull(),
  rateCents: integer("rate_cents").notNull(),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
});

export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  notes: text("notes"),
  paidAt: text("paid_at").notNull().$default(() => new Date().toISOString()),
  createdBy: integer("created_by").references(() => users.id),
});

export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  entryDate: text("entry_date").notNull(),
  odometer: real("odometer"),
  gallons: real("gallons"),
  fuelPricePerGallon: real("fuel_price_per_gallon"),
  fuelCostCents: integer("fuel_cost_cents"),
  grossCents: integer("gross_cents"),
  workingHours: real("working_hours"),
  cashReceivedCents: integer("cash_received_cents"),
  cashExpenseCents: integer("cash_expense_cents"),
  cashExpenseNote: text("cash_expense_note"),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
  editedAt: text("edited_at"),
});

export const ledgerDeductions = pgTable("ledger_deductions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull(),
  startWeek: text("start_week").notNull(),
  stoppedWeek: text("stopped_week"),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
});

export const ledgerWeeklyPayments = pgTable("ledger_weekly_payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  weekStart: text("week_start").notNull(),
  paidAt: text("paid_at").notNull().$default(() => new Date().toISOString()),
});

export const salaryEntries = pgTable("salary_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  type: text("type", { enum: ["hourly", "per_ton"] }).notNull(),
  customer: text("customer"),
  loadType: text("load_type"),
  tons: real("tons"),
  hours: real("hours"),
  rateCents: integer("rate_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  notes: text("notes"),
  entryDate: text("entry_date").notNull(),
  paymentId: integer("payment_id"),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
});
