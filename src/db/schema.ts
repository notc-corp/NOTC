import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role", { enum: ["owner", "driver"] }).notNull(),
  pinHash: text("pin_hash").notNull(),
  truckNumber: text("truck_number"),
  phone: text("phone"), // for SMS receipt uploads
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
});

export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  driverId: integer("driver_id")
    .notNull()
    .references(() => users.id),
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
