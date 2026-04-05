import Database from "better-sqlite3";
import bcryptjs from "bcryptjs";

async function seedDemo() {
  const db = new Database("./audit.db");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Clear existing demo data (keep owner)
  db.prepare("DELETE FROM anomalies").run();
  db.prepare("DELETE FROM audit_reports").run();
  db.prepare("DELETE FROM expenses").run();
  db.prepare("DELETE FROM trips").run();
  db.prepare("DELETE FROM users WHERE role = 'driver'").run();

  // Create 3 drivers with different profiles
  const drivers = [
    { name: "Mike Rodriguez", pin: "1111", truck: "Truck 07", phone: "555-0101" },
    { name: "Jake Thompson", pin: "2222", truck: "Truck 12", phone: "555-0202" },
    { name: "Earl Davis", pin: "3333", truck: "Truck 03", phone: "555-0303" },
  ];

  const driverIds: number[] = [];
  for (const d of drivers) {
    const hash = await bcryptjs.hash(d.pin, 10);
    const result = db.prepare(
      "INSERT INTO users (name, role, pin_hash, truck_number, phone, is_active) VALUES (?, 'driver', ?, ?, ?, 1)"
    ).run(d.name, hash, d.truck, d.phone);
    driverIds.push(Number(result.lastInsertRowid));
    console.log(`Created driver: ${d.name} (PIN: ${d.pin}, ${d.truck})`);
  }

  const [mikeId, jakeId, earlId] = driverIds;
  const ownerId = db.prepare("SELECT id FROM users WHERE role = 'owner'").get() as { id: number };

  // Helper: date strings for the past 5 days
  const today = new Date();
  const days: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  // ============================================================
  // MIKE RODRIGUEZ - Veteran, 15 years experience, clean records
  // Consistent MPG, always has receipts, no anomalies
  // ============================================================
  let mikeOdo = 245000;

  for (let i = 0; i < 5; i++) {
    const miles = 280 + Math.floor(Math.random() * 80); // 280-360 miles
    const endOdo = mikeOdo + miles;
    const gallons = miles / (6.2 + Math.random() * 0.6); // 6.2-6.8 MPG (consistent)
    const pricePerGal = 3.85 + Math.random() * 0.30; // $3.85-4.15
    const fuelTotal = gallons * pricePerGal;

    const trip = db.prepare(`
      INSERT INTO trips (driver_id, status, start_odometer, end_odometer, start_photo_path, end_photo_path,
        start_ocr_confidence, end_ocr_confidence, started_at, ended_at, notes)
      VALUES (?, 'completed', ?, ?, '/uploads/odometer/mike-start.jpg', '/uploads/odometer/mike-end.jpg',
        0.95, 0.93, ?, ?, ?)
    `).run(
      mikeId, mikeOdo, endOdo,
      `${days[i]}T06:30:00.000Z`,
      `${days[i]}T16:45:00.000Z`,
      i === 2 ? "Detour due to road construction on I-40" : null
    );
    const tripId = Number(trip.lastInsertRowid);

    // Fuel receipt - always present, always reasonable
    db.prepare(`
      INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
        gallons, price_per_gallon_cents, fuel_total_cents, station_name, ocr_confidence, is_manually_edited, created_at)
      VALUES (?, ?, ?, 'fuel', ?, ?, '/uploads/receipts/mike-fuel.jpg',
        ?, ?, ?, ?, 0.92, 0, ?)
    `).run(
      tripId, mikeId, mikeId,
      Math.round(fuelTotal * 100),
      `Diesel fill-up`,
      Math.round(gallons * 100) / 100,
      Math.round(pricePerGal * 100),
      Math.round(fuelTotal * 100),
      ["Pilot Travel Center", "Love's Travel Stop", "Flying J", "TA Petro", "Casey's"][i],
      `${days[i]}T12:00:00.000Z`
    );

    // Occasional toll
    if (i % 2 === 0) {
      db.prepare(`
        INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
          ocr_confidence, created_at)
        VALUES (?, ?, ?, 'tolls', ?, ?, '/uploads/receipts/mike-toll.jpg', 0.88, ?)
      `).run(tripId, mikeId, mikeId, 1250 + Math.floor(Math.random() * 500), "Turnpike toll", `${days[i]}T09:30:00.000Z`);
    }

    mikeOdo = endOdo;
  }
  console.log("  → Mike: 5 clean trips, good MPG, all receipts ✓");

  // ============================================================
  // JAKE THOMPSON - 2 years experience, sloppy with receipts
  // Sometimes forgets receipts, inconsistent fueling, one suspicious entry
  // ============================================================
  let jakeOdo = 189000;

  for (let i = 0; i < 5; i++) {
    const miles = 200 + Math.floor(Math.random() * 150); // 200-350 miles
    const endOdo = jakeOdo + miles;

    // Jake's MPG is inconsistent - sometimes suspiciously low
    const mpg = i === 3 ? 3.5 : (5.5 + Math.random() * 1.5); // Day 3: terrible MPG
    const gallons = miles / mpg;
    const pricePerGal = i === 1 ? 5.20 : (3.90 + Math.random() * 0.25); // Day 1: overpriced fuel
    const fuelTotal = gallons * pricePerGal;

    const trip = db.prepare(`
      INSERT INTO trips (driver_id, status, start_odometer, end_odometer, start_photo_path, end_photo_path,
        start_ocr_confidence, end_ocr_confidence, started_at, ended_at, notes)
      VALUES (?, 'completed', ?, ?, '/uploads/odometer/jake-start.jpg', '/uploads/odometer/jake-end.jpg',
        ?, ?, ?, ?, ?)
    `).run(
      jakeId, jakeOdo, endOdo,
      i === 4 ? 0.55 : 0.88, // Day 4: blurry odometer photo
      i === 4 ? 0.60 : 0.85,
      `${days[i]}T07:15:00.000Z`,
      `${days[i]}T17:30:00.000Z`,
      i === 3 ? "Had to idle for 2 hours at loading dock" : null
    );
    const tripId = Number(trip.lastInsertRowid);

    // Fuel receipt - sometimes missing
    if (i !== 2) { // Day 2: no receipt at all on a 300+ mile trip
      db.prepare(`
        INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
          gallons, price_per_gallon_cents, fuel_total_cents, station_name, ocr_confidence, is_manually_edited, created_at)
        VALUES (?, ?, ?, 'fuel', ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tripId, jakeId, jakeId,
        Math.round(fuelTotal * 100),
        `Diesel`,
        i === 0 ? null : '/uploads/receipts/jake-fuel.jpg', // Day 0: no receipt photo
        Math.round(gallons * 100) / 100,
        Math.round(pricePerGal * 100),
        Math.round(fuelTotal * 100),
        ["QuikTrip", "Shell", "Chevron", "BP", "Speedway"][i],
        i === 0 ? 0.45 : 0.82,
        0,
        `${days[i]}T13:00:00.000Z`
      );
    }

    // Jake submits food expenses liberally
    db.prepare(`
      INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
        ocr_confidence, created_at)
      VALUES (?, ?, ?, 'food', ?, ?, ?, 0.75, ?)
    `).run(
      tripId, jakeId, jakeId,
      1500 + Math.floor(Math.random() * 2000), // $15-35 food
      ["Subway", "McDonald's", "Wendy's", "Denny's", "Waffle House"][i],
      i % 2 === 0 ? '/uploads/receipts/jake-food.jpg' : null, // Half the time no receipt
      `${days[i]}T12:30:00.000Z`
    );

    // Day 3: duplicate fuel receipt (same station, 20 min apart) — suspicious
    if (i === 3) {
      db.prepare(`
        INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
          gallons, price_per_gallon_cents, fuel_total_cents, station_name, ocr_confidence, created_at)
        VALUES (?, ?, ?, 'fuel', ?, 'Diesel - second fill', '/uploads/receipts/jake-fuel2.jpg',
          ?, ?, ?, 'BP', 0.78, ?)
      `).run(
        tripId, jakeId, jakeId,
        8500, // $85
        22.5,
        378,
        8505,
        `${days[i]}T13:20:00.000Z` // 20 min after first fill
      );
    }

    jakeOdo = endOdo;
  }
  console.log("  → Jake: 5 trips, missing receipts, price outlier, duplicate receipt, bad MPG ⚠️");

  // ============================================================
  // EARL DAVIS - 8 years experience, mostly good but has a mileage gap
  // Solid driver, one mileage discrepancy (forgot to end previous trip properly)
  // ============================================================
  let earlOdo = 312000;

  for (let i = 0; i < 4; i++) { // Only 4 trips (took a day off)
    const dayIdx = i < 2 ? i : i + 1; // Skip day index 2 (day off)
    const miles = 300 + Math.floor(Math.random() * 100);

    // Day 1: mileage gap — start doesn't match previous end
    const startOdo = i === 1 ? earlOdo + 47 : earlOdo; // 47 unaccounted miles
    const endOdo = startOdo + miles;

    const gallons = miles / (6.0 + Math.random() * 0.8);
    const pricePerGal = 3.92 + Math.random() * 0.18;
    const fuelTotal = gallons * pricePerGal;

    const trip = db.prepare(`
      INSERT INTO trips (driver_id, status, start_odometer, end_odometer, start_photo_path, end_photo_path,
        start_ocr_confidence, end_ocr_confidence, started_at, ended_at, notes)
      VALUES (?, 'completed', ?, ?, '/uploads/odometer/earl-start.jpg', '/uploads/odometer/earl-end.jpg',
        0.91, 0.89, ?, ?, ?)
    `).run(
      earlId, startOdo, endOdo,
      `${days[dayIdx]}T05:45:00.000Z`,
      `${days[dayIdx]}T15:00:00.000Z`,
      i === 1 ? "Started from a different yard today" : null
    );
    const tripId = Number(trip.lastInsertRowid);

    // Earl always has receipts
    db.prepare(`
      INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
        gallons, price_per_gallon_cents, fuel_total_cents, station_name, ocr_confidence, is_manually_edited, created_at)
      VALUES (?, ?, ?, 'fuel', ?, 'Diesel', '/uploads/receipts/earl-fuel.jpg',
        ?, ?, ?, ?, 0.90, 0, ?)
    `).run(
      tripId, earlId, earlId,
      Math.round(fuelTotal * 100),
      Math.round(gallons * 100) / 100,
      Math.round(pricePerGal * 100),
      Math.round(fuelTotal * 100),
      ["Pilot Travel Center", "Love's Travel Stop", "Flying J", "TA Petro"][i],
      `${days[dayIdx]}T11:00:00.000Z`
    );

    // Earl has maintenance on day 3
    if (i === 2) {
      db.prepare(`
        INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
          ocr_confidence, created_at)
        VALUES (?, ?, ?, 'maintenance', 15000, 'Oil change and filter at truck stop', '/uploads/receipts/earl-maint.jpg',
          0.85, ?)
      `).run(tripId, earlId, earlId, `${days[dayIdx]}T08:30:00.000Z`);
    }

    // Owner uploaded a receipt on Earl's behalf on day 0
    if (i === 0) {
      db.prepare(`
        INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
          ocr_confidence, is_manually_edited, created_at)
        VALUES (?, ?, ?, 'tolls', 1875, 'Interstate toll - owner uploaded', '/uploads/receipts/earl-toll.jpg',
          0.82, 1, ?)
      `).run(tripId, earlId, ownerId.id, `${days[dayIdx]}T10:00:00.000Z`);
    }

    earlOdo = endOdo;
  }
  console.log("  → Earl: 4 trips, mileage gap on day 2, maintenance expense, mostly clean ⚠️");

  // ============================================================
  // JAKE also has one active trip (today) - still on the road
  // ============================================================
  const activeTrip = db.prepare(`
    INSERT INTO trips (driver_id, status, start_odometer, start_photo_path,
      start_ocr_confidence, started_at, notes)
    VALUES (?, 'active', ?, '/uploads/odometer/jake-active.jpg',
      0.87, ?, 'Headed to Dallas')
  `).run(jakeId, jakeOdo, `${days[4]}T07:00:00.000Z`);

  db.prepare(`
    INSERT INTO expenses (trip_id, driver_id, uploaded_by, category, amount_cents, description, receipt_path,
      gallons, price_per_gallon_cents, fuel_total_cents, station_name, ocr_confidence, created_at)
    VALUES (?, ?, ?, 'fuel', 7850, 'Diesel', '/uploads/receipts/jake-today.jpg',
      19.5, 403, 7859, 'Love''s Travel Stop', 0.88, ?)
  `).run(Number(activeTrip.lastInsertRowid), jakeId, jakeId, `${days[4]}T09:30:00.000Z`);

  console.log("  → Jake: 1 active trip today (still on the road)");

  console.log("\n--- Demo data loaded! ---");
  console.log("\nDriver PINs:");
  console.log("  Mike Rodriguez: 1111 (veteran, clean)");
  console.log("  Jake Thompson:  2222 (sloppy, suspicious)");
  console.log("  Earl Davis:     3333 (solid, one mileage gap)");
  console.log("  Owner:          1234");
  console.log("\nNow log in as Owner (1234) and generate today's report!");

  db.close();
}

seedDemo().catch(console.error);
