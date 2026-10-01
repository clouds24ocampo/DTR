const userId = "6abdabc59ab0c601d20352cb";
const userObjId = ObjectId(userId);

// 1. Upsert User Adrian Boncodin
db.users.updateOne(
  { _id: userObjId },
  {
    $set: {
      _id: userObjId,
      username: "Adrian5517",
      password: "$2a$12$YHMwSGQMvKr5ddl8VUOz.ecRTVzyhBBHdkSgCxqV1Krb3yH2A8GBy",
      firstName: "Adrian",
      middleName: "Juel",
      lastName: "Boncodin",
      idNumber: "QC-2026-0001",
      email: "adrian.boncodin@quantumcloud.com",
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

// 3. Define attendance records (Sept 24 - Sept 30, excluding Sunday Sept 27)
const attendance = [
  {
    date: "2026-09-24",
    in: "07:54",
    out: "17:05",
    morningDur: "04:06",
    afterDur: "04:05",
    totalWork: "08:11",
    earlyTag: "Early 6 Minutes",
    otTag: "Overtime 5 Minutes"
  },
  {
    date: "2026-09-25",
    in: "07:58",
    out: "17:02",
    morningDur: "04:02",
    afterDur: "04:02",
    totalWork: "08:04",
    earlyTag: "Early 2 Minutes",
    otTag: "Overtime 2 Minutes"
  },
  {
    date: "2026-09-26",
    in: "07:51",
    out: "17:07",
    morningDur: "04:09",
    afterDur: "04:07",
    totalWork: "08:16",
    earlyTag: "Early 9 Minutes",
    otTag: "Overtime 7 Minutes"
  },
  {
    date: "2026-09-28",
    in: "07:55",
    out: "17:03",
    morningDur: "04:05",
    afterDur: "04:03",
    totalWork: "08:08",
    earlyTag: "Early 5 Minutes",
    otTag: "Overtime 3 Minutes"
  },
  {
    date: "2026-09-29",
    in: "07:52",
    out: "17:04",
    morningDur: "04:08",
    afterDur: "04:04",
    totalWork: "08:12",
    earlyTag: "Early 8 Minutes",
    otTag: "Overtime 4 Minutes"
  },
  {
    date: "2026-09-30",
    in: "07:56",
    out: "17:01",
    morningDur: "04:04",
    afterDur: "04:01",
    totalWork: "08:05",
    earlyTag: "Early 4 Minutes",
    otTag: "Overtime 1 Minute"
  }
];

// 4. Upsert Schedules and DTRs
for (const item of attendance) {
  // Upsert Schedule
  db.schedules.updateOne(
    { userId: userId, date: item.date },
    {
      $set: {
        userId: userId,
        date: item.date,
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

  // Upsert DTR
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

// 5. Ensure schedule exists for today (2026-10-01)
db.schedules.updateOne(
  { userId: userId, date: "2026-10-01" },
  {
    $set: {
      userId: userId,
      date: "2026-10-01",
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

print("SUCCESS: Adrian Boncodin user, schedules, and DTR records inserted into local database!");
