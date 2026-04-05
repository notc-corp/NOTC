import { db } from "@/lib/db";
import { trips, expenses, users, auditReports, anomalies } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const DEFAULT_MPG = 6; // Loaded semi average

interface TripSummary {
  trip_id: number;
  miles_driven: number;
  expected_gallons: number;
  actual_gallons: number;
  actual_mpg: number | null;
  expected_fuel_cost_cents: number;
  actual_fuel_cost_cents: number;
  variance_cents: number;
  anomalies: string[];
}

interface DriverSummary {
  driver_id: number;
  driver_name: string;
  truck_number: string | null;
  trips: TripSummary[];
}

export async function generateDailyReport(dateStr: string) {
  const nextDay = new Date(dateStr);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split("T")[0];

  // Get all completed trips for the date
  const dayTrips = db
    .select({
      trip: trips,
      driverName: users.name,
      truckNumber: users.truckNumber,
    })
    .from(trips)
    .innerJoin(users, eq(trips.driverId, users.id))
    .where(
      and(
        gte(trips.startedAt, dateStr),
        lte(trips.startedAt, nextDayStr)
      )
    )
    .all();

  // Get all expenses for the date
  const dayExpenses = db
    .select()
    .from(expenses)
    .where(
      and(gte(expenses.createdAt, dateStr), lte(expenses.createdAt, nextDayStr))
    )
    .all();

  // Calculate average fuel price for the day
  const fuelExpenses = dayExpenses.filter(
    (e) => e.category === "fuel" && e.pricePerGallonCents
  );
  const avgPricePerGallonCents =
    fuelExpenses.length > 0
      ? Math.round(
          fuelExpenses.reduce((sum, e) => sum + (e.pricePerGallonCents || 0), 0) /
            fuelExpenses.length
        )
      : 400; // Default $4.00/gal if no data

  const anomalyList: Array<{
    tripId: number | null;
    expenseId: number | null;
    driverId: number;
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }> = [];

  // Build driver summaries
  const driverMap = new Map<number, DriverSummary>();

  for (const { trip, driverName, truckNumber } of dayTrips) {
    if (!driverMap.has(trip.driverId)) {
      driverMap.set(trip.driverId, {
        driver_id: trip.driverId,
        driver_name: driverName,
        truck_number: truckNumber,
        trips: [],
      });
    }

    const tripExpenses = dayExpenses.filter((e) => e.tripId === trip.id);
    const fuelTripExpenses = tripExpenses.filter((e) => e.category === "fuel");

    const milesDriven =
      trip.startOdometer && trip.endOdometer
        ? trip.endOdometer - trip.startOdometer
        : 0;

    const actualGallons = fuelTripExpenses.reduce(
      (sum, e) => sum + (e.gallons || 0),
      0
    );
    const actualFuelCostCents = fuelTripExpenses.reduce(
      (sum, e) => sum + (e.fuelTotalCents || e.amountCents || 0),
      0
    );

    const expectedGallons = milesDriven / DEFAULT_MPG;
    const expectedFuelCostCents = Math.round(
      expectedGallons * avgPricePerGallonCents
    );

    const actualMpg = actualGallons > 0 ? milesDriven / actualGallons : null;

    const tripAnomalies: string[] = [];

    // Anomaly: MPG outlier
    if (actualMpg !== null && (actualMpg < 4 || actualMpg > 10)) {
      const msg = `MPG outlier: ${actualMpg.toFixed(1)} mpg (expected 4-10)`;
      tripAnomalies.push(msg);
      anomalyList.push({
        tripId: trip.id,
        expenseId: null,
        driverId: trip.driverId,
        type: "mpg_outlier",
        severity: "warning",
        message: msg,
      });
    }

    // Anomaly: Fuel price outlier
    for (const exp of fuelTripExpenses) {
      if (
        exp.pricePerGallonCents &&
        Math.abs(exp.pricePerGallonCents - avgPricePerGallonCents) >
          avgPricePerGallonCents * 0.2
      ) {
        const msg = `Fuel price outlier: $${(exp.pricePerGallonCents / 100).toFixed(2)}/gal vs avg $${(avgPricePerGallonCents / 100).toFixed(2)}/gal`;
        tripAnomalies.push(msg);
        anomalyList.push({
          tripId: trip.id,
          expenseId: exp.id,
          driverId: trip.driverId,
          type: "price_outlier",
          severity: "warning",
          message: msg,
        });
      }
    }

    // Anomaly: Missing receipt
    const noReceiptExpenses = tripExpenses.filter((e) => !e.receiptPath);
    if (noReceiptExpenses.length > 0) {
      const msg = `${noReceiptExpenses.length} expense(s) without receipt`;
      tripAnomalies.push(msg);
      anomalyList.push({
        tripId: trip.id,
        expenseId: null,
        driverId: trip.driverId,
        type: "missing_receipt",
        severity: "info",
        message: msg,
      });
    }

    // Anomaly: Long trip with no fuel
    if (milesDriven > 200 && fuelTripExpenses.length === 0) {
      const msg = `${milesDriven} mile trip with no fuel receipts`;
      tripAnomalies.push(msg);
      anomalyList.push({
        tripId: trip.id,
        expenseId: null,
        driverId: trip.driverId,
        type: "no_fuel_long_trip",
        severity: "warning",
        message: msg,
      });
    }

    // Anomaly: Low OCR confidence
    if (
      (trip.startOcrConfidence && trip.startOcrConfidence < 0.7) ||
      (trip.endOcrConfidence && trip.endOcrConfidence < 0.7)
    ) {
      const msg = "Low OCR confidence on odometer reading";
      tripAnomalies.push(msg);
      anomalyList.push({
        tripId: trip.id,
        expenseId: null,
        driverId: trip.driverId,
        type: "low_ocr_confidence",
        severity: "info",
        message: msg,
      });
    }

    driverMap.get(trip.driverId)!.trips.push({
      trip_id: trip.id,
      miles_driven: milesDriven,
      expected_gallons: Math.round(expectedGallons * 10) / 10,
      actual_gallons: Math.round(actualGallons * 10) / 10,
      actual_mpg: actualMpg ? Math.round(actualMpg * 10) / 10 : null,
      expected_fuel_cost_cents: expectedFuelCostCents,
      actual_fuel_cost_cents: actualFuelCostCents,
      variance_cents: actualFuelCostCents - expectedFuelCostCents,
      anomalies: tripAnomalies,
    });
  }

  const driverSummaries = Array.from(driverMap.values());

  // Fleet totals
  const totalMiles = driverSummaries.reduce(
    (sum, ds) => sum + ds.trips.reduce((s, t) => s + t.miles_driven, 0),
    0
  );
  const totalFuelCostCents = driverSummaries.reduce(
    (sum, ds) =>
      sum + ds.trips.reduce((s, t) => s + t.actual_fuel_cost_cents, 0),
    0
  );
  const totalGallons = driverSummaries.reduce(
    (sum, ds) => sum + ds.trips.reduce((s, t) => s + t.actual_gallons, 0),
    0
  );

  const reportData = {
    date: dateStr,
    fleet_summary: {
      total_miles: totalMiles,
      total_fuel_cost_cents: totalFuelCostCents,
      total_gallons: Math.round(totalGallons * 10) / 10,
      fleet_avg_mpg:
        totalGallons > 0
          ? Math.round((totalMiles / totalGallons) * 10) / 10
          : 0,
      active_drivers: driverSummaries.length,
      completed_trips: dayTrips.length,
      anomaly_count: {
        info: anomalyList.filter((a) => a.severity === "info").length,
        warning: anomalyList.filter((a) => a.severity === "warning").length,
        critical: anomalyList.filter((a) => a.severity === "critical").length,
      },
    },
    driver_summaries: driverSummaries,
  };

  // Save report
  const report = db
    .insert(auditReports)
    .values({
      reportDate: dateStr,
      reportJson: JSON.stringify(reportData),
      anomalyCount: anomalyList.length,
    })
    .returning()
    .get();

  // Save anomalies
  for (const a of anomalyList) {
    db.insert(anomalies)
      .values({
        reportId: report.id,
        tripId: a.tripId,
        expenseId: a.expenseId,
        driverId: a.driverId,
        type: a.type,
        severity: a.severity,
        message: a.message,
      })
      .run();
  }

  return report;
}
