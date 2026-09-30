import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/workforce/user.model";
import Department from "../models/global/department.model";
import Workplace from "../models/workforce/workplace.model";
import Schedule from "../models/global/schedule.model";
import { normalizeDate } from "../utils/global/time.utils";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@quantumcloud.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";

async function upsertUser(input: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  position: string[];
}) {
  const hashed = await bcrypt.hash(input.password, 10);
  const now = new Date();
  const user = await User.findOneAndUpdate(
    { $or: [{ email: input.email.toLowerCase() }, { username: input.username.toLowerCase() }] },
    {
      $setOnInsert: {
        username: input.username.toLowerCase(),
        email: input.email.toLowerCase(),
        idNumber: input.idNumber,
        createdAt: now,
      },
      $set: {
        password: hashed,
        firstName: input.firstName,
        lastName: input.lastName,
        position: input.position,
        salaryType: "monthly",
        salary: 0,
        archived: false,
        updatedAt: now,
      },
    },
    { upsert: true, new: true }
  );
  return user;
}

async function main() {
  const uri = process.env.MONGO_DB_URI as string;
  if (!uri) throw new Error("MONGO_DB_URI is not set in backend/.env");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected. Seeding...");

  const admin = await upsertUser({
    username: "admin",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    firstName: "Super",
    lastName: "Admin",
    idNumber: "QC-0001",
    position: ["HR", "Operation Manager", "Workforce"],
  });

  const employee = await upsertUser({
    username: "employee1",
    email: "employee1@quantumcloud.com",
    password: "Employee@123456",
    firstName: "Juan",
    lastName: "Dela Cruz",
    idNumber: "QC-0002",
    position: ["Employee"],
  });

  const department = await Department.findOneAndUpdate(
    { name: "Operations" },
    {
      $setOnInsert: { type: "Operations", description: "Default operations team", location: "Main Office", status: true },
      $set: { head: admin._id, updatedAt: new Date() },
      $addToSet: { members: { $each: [admin._id, employee._id] } },
    },
    { upsert: true, new: true }
  );

  const itDepartment = await Department.findOneAndUpdate(
    { name: "IT" },
    {
      $setOnInsert: { type: "IT", description: "Information Technology", location: "Main Office", status: true },
      $set: { head: admin._id, updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  const workplace = await Workplace.findOneAndUpdate(
    { name: "Main Office" },
    {
      $setOnInsert: {
        workstationCount: 2,
        workstations: [
          { stationName: "Station 1", dates: [] },
          { stationName: "Station 2", dates: [] },
        ],
      },
    },
    { upsert: true, new: true }
  );

  const today = normalizeDate(new Date().toISOString().slice(0, 10));
  const sessionTemplate = {
    label: "Day Shift",
    workCredits: "08:00",
    breakCredits: "01:00",
    breakCount: 2,
    mealCredits: "01:00",
    mealCount: 1,
    scheduledStartTime: "08:00",
    scheduledEndTime: "17:00",
    startMealTime: ["12:00"],
    fullSched: [
      { type: "work", start: "08:00", end: "12:00" },
      { type: "meal", start: "12:00", end: "13:00" },
      { type: "work", start: "13:00", end: "17:00" },
    ],
  };

  for (const u of [admin, employee]) {
    await Schedule.findOneAndUpdate(
      { userId: String(u._id), date: today },
      {
        $setOnInsert: {
          userId: String(u._id),
          date: today,
          teamName: "Operations",
          workstationId: String(workplace._id),
          sessions: [sessionTemplate],
        },
      },
      { upsert: true, new: true }
    );
  }

  const counts = {
    users: await User.countDocuments(),
    departments: await Department.countDocuments(),
    workplaces: await Workplace.countDocuments(),
    schedulesToday: await Schedule.countDocuments({ date: today }),
    database: mongoose.connection.db?.databaseName,
  };

  console.log("Seed complete:");
  console.log(`- admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`- employee: employee1@quantumcloud.com / Employee@123456`);
  console.log(`- department: ${String(department.name)}, ${String(itDepartment.name)}`);
  console.log(`- workplace: ${String(workplace.name)}`);
  console.log(`- counts: ${JSON.stringify(counts)}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
