import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoPath: text("logo_path"),
  primaryColor: text("primary_color").default("#d97706"),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const trucks = sqliteTable("trucks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  number: text("number").notNull().unique(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  vin: text("vin"),
  licensePlate: text("license_plate"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  role: text("role", { enum: ["owner", "driver"] }).notNull(),
  pinHash: text("pin_hash").notNull(),
  truckNumber: text("truck_number"),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
});

export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  driverId: integer("driver_id")
    .notNull()
    .references(() => users.id),
  truckId: integer("truck_id").references(() => trucks.id),
  status: text("status", { enum: ["active", "completed", "cancelled"] })
    .notNull()
    .default("active"),
  startOdometer: real("start_odometer"),
  endOdometer: real("end_odometer"),
  startPhotoPath: text("start_photo_path"),
  endPhotoPath: text("end_photo_path"),
  startOcrRaw: text("start_ocr_raw"),
  endOcrRaw: text("end_ocr_raw"),
  startOcrConfidence: real("start_ocr_confidence"),
  endOcrConfidence: real("end_ocr_confidence"),
  startedAt: text("started_at").notNull().default("(datetime('now'))"),
  endedAt: text("ended_at"),
  notes: text("notes"),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  tripId: integer("trip_id").references(() => trips.id),
  driverId: integer("driver_id")
    .notNull()
    .references(() => users.id),
  uploadedBy: integer("uploaded_by")
    .notNull()
    .references(() => users.id),
  category: text("category", {
    enum: ["fuel", "tolls", "maintenance", "food", "other"],
  }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  description: text("description"),
  receiptPath: text("receipt_path"),
  // Fuel-specific fields
  gallons: real("gallons"),
  pricePerGallonCents: integer("price_per_gallon_cents"),
  fuelTotalCents: integer("fuel_total_cents"),
  stationName: text("station_name"),
  // OCR audit trail
  ocrRaw: text("ocr_raw"),
  ocrConfidence: real("ocr_confidence"),
  isManuallyEdited: integer("is_manually_edited", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
});

export const auditReports = sqliteTable("audit_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportDate: text("report_date").notNull(),
  generatedAt: text("generated_at").notNull().default("(datetime('now'))"),
  reportJson: text("report_json").notNull(),
  anomalyCount: integer("anomaly_count").notNull().default(0),
});

export const anomalies = sqliteTable("anomalies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id")
    .notNull()
    .references(() => auditReports.id),
  tripId: integer("trip_id").references(() => trips.id),
  expenseId: integer("expense_id").references(() => expenses.id),
  driverId: integer("driver_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
  message: text("message").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: text("resolved_at"),
});

export const inspections = sqliteTable("inspections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  driverId: integer("driver_id").notNull().references(() => users.id),
  tripId: integer("trip_id").references(() => trips.id),
  type: text("type", { enum: ["pre", "post"] }).notNull(),
  safeToOperate: integer("safe_to_operate", { mode: "boolean" }),
  hasDefects: integer("has_defects", { mode: "boolean" }).notNull().default(false),
  hasOutOfService: integer("has_out_of_service", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at").notNull().default("(datetime('now'))"),
});

export const inspectionItems = sqliteTable("inspection_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id),
  category: text("category").notNull(),
  item: text("item").notNull(),
  status: text("status", { enum: ["ok", "defect", "na"] }).notNull().default("ok"),
  notes: text("notes"),
});

export const defects = sqliteTable("defects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
});

export const downtimeEvents = sqliteTable("downtime_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  driverId: integer("driver_id").notNull().references(() => users.id),
  tripId: integer("trip_id").references(() => trips.id),
  defectId: integer("defect_id").references(() => defects.id),
  reason: text("reason"),
  startedAt: text("started_at").notNull().default("(datetime('now'))"),
  endedAt: text("ended_at"),
});

export const defectNotes = sqliteTable("defect_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  defectId: integer("defect_id").notNull().references(() => defects.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
  updatedAt: text("updated_at"),
});

export const tripLocations = sqliteTable("trip_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  speed: real("speed"),         // mph
  heading: real("heading"),     // degrees 0-360
  accuracy: real("accuracy"),   // meters
  recordedAt: text("recorded_at").notNull().default("(datetime('now'))"),
});
