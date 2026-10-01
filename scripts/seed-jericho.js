const userId = "6abdc1858e772e20a7dd05df";
const userObjId = ObjectId(userId);

// 1. Upsert User Jericho Zaleta
db.users.updateOne(
  { _id: userObjId },
  {
    $set: {
      _id: userObjId,
      username: "Choy",
      password: "$2a$12$oFPrJyad7ihfXC9f967K/u8pyIHQYeV6TopVB4KTcV13WU/RqophW",
      firstName: "Jericho",
      middleName: "Dantes",
      lastName: "Zaleta",
      idNumber: "QC-2026-0002",
      email: "jericho.zaleta@quantumcloud.com",
      position: ["Software Developer"],
      salary: 35000,
      salaryType: "monthly",
      archived: false,
      gender: "Male",
      location: "Main Office",
      phone: "",
      about: "Software Developer",
      philhealth: true,
      sss: true,
      pagibig: true,
      deviceAccessToken: "",
      workInfo: "",
      profilePicture: "",
      createdAt: new Date("2026-09-24T00:00:00.000Z"),
      updatedAt: new Date()
    }
  },
  { upsert: true }
);

// 2. Add to IT department members
db.departments.updateOne(
  { name: "IT" },
  { $addToSet: { members: userObjId } }
);

// 3. Define attendance records:
// Present: Sept 24 (Thu), Sept 25 (Fri), Sept 26 (Sat), Sept 29 (Tue), Sept 30 (Wed)
// Excluded: Sept 27 (Sunday Rest Day)
// ABSENT: Sept 28 (Monday) -> Has Schedule, but NO DTR attendance record
const attendance = [
  {
    date: "2026-09-24",
    in: "07:55",
    out: "17:03",
    morningDur: "04:05",
    afterDur: "04:03",
    totalWork: "08:08",
    earlyTag: "Early 5 Minutes",
    otTag: "Overtime 3 Minutes"
  },
  {
    date: "2026-09-25",
    in: "07:52",
    out: "17:04",
    morningDur: "04:08",
    afterDur: "04:04",
    totalWork: "08:12",
    earlyTag: "Early 8 Minutes",
    otTag: "Overtime 4 Minutes"
  },
  {
    date: "2026-09-26",
    in: "07:57",
    out: "17:02",
    morningDur: "04:03",
    afterDur: "04:02",
    totalWork: "08:05",
    earlyTag: "Early 3 Minutes",
    otTag: "Overtime 2 Minutes"
  },
  {
    date: "2026-09-29",
    in: "07:53",
    out: "17:06",
    morningDur: "04:07",
    afterDur: "04:06",
    totalWork: "08:13",
    earlyTag: "Early 7 Minutes",
    otTag: "Overtime 6 Minutes"
  },
  {
    date: "2026-09-30",
    in: "07:56",
    out: "17:02",
    morningDur: "04:04",
    afterDur: "04:02",
    totalWork: "08:06",
    earlyTag: "Early 4 Minutes",
    otTag: "Overtime 2 Minutes"
  }
];

// 4. Upsert Schedules for ALL working days (including Monday Sept 28 where he was scheduled but absent)
const allScheduleDates = [
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-09-28", // Scheduled but absent!
  "2026-09-29",
  "2026-09-30",
  "2026-10-01"  // Today's schedule
];

for (const schedDate of allScheduleDates) {
  db.schedules.updateOne(
    { userId: userId, date: schedDate },
    {
      $set: {
        userId: userId,
        date: schedDate,
        teamName: "IT",
        sessions: [
          {
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
              { type: "work", start: "13:00", end: "17:00" }
            ]
          }
        ]
      }
    },
    { upsert: true }
  );
}

// 5. Upsert DTR attendance for PRESENT days only
for (const item of attendance) {
  db.dtrs.updateOne(
    { userId: userId, date: item.date },
    {
      $set: {
        userId: userId,
        date: item.date,
        sessions: [
          {
            label: "Day Shift",
            workCredits: "08:00",
            breakCredits: "01:00",
            breakCount: 2,
            mealCredits: "01:00",
            mealCount: 1,
            DTRTotalWork: item.totalWork,
            DTRTotalBreak: "00:00",
            DTRTotalMeal: "01:00",
            scheduledStartTime: "08:00",
            scheduledEndTime: "17:00",
            startMealTime: "12:00",
            fullDTR: [
              {
                type: "work",
                startTime: item.in,
                startTag: item.earlyTag,
                endTime: "12:00",
                endTag: "good",
                duration: item.morningDur,
                status: "done"
              },
              {
                type: "meal",
                startTime: "12:00",
                startTag: "good",
                endTime: "13:00",
                endTag: "good",
                duration: "01:00",
                status: "done"
              },
              {
                type: "work",
                startTime: "13:00",
                startTag: "good",
                endTime: item.out,
                endTag: item.otTag,
                duration: item.afterDur,
                status: "done"
              }
            ]
          }
        ]
      }
    },
    { upsert: true }
  );
}

// 6. Ensure Monday Sept 28 has NO DTR entry so it registers as an ABSENT day
db.dtrs.deleteOne({ userId: userId, date: "2026-09-28" });

print("SUCCESS: Jericho Zaleta (Choy) seeded with attendance and Monday Sept 28 marked as ABSENT!");
