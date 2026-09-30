import { Request, Response } from "express";
import mongoose from "mongoose";
import { CustomRequest } from "src/types/global/express/express.type";
import UserModel from "../../../models/workforce/user.model";
import Job from "../../../models/hr/job/job.model";
import DocumentModel from "../../../models/hr/document/document.model";
import Department from "../../../models/global/department.model";
import Schedule from "../../../models/global/schedule.model";
import ReportModel from "../../../models/global/report.model";
import ProgressReportModel from "../../../models/global/progress-report.model";
import { getUserFromCookie } from "../../../utils/global/getCookie";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

export const globalSearch = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const user = getUserFromCookie(req);
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      res.status(400).json({
        message: "Search query is required",
        results: [],
      });
      return;
    }

    const searchQuery = q.trim();
    const searchRegex = { $regex: searchQuery.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const userRole = user.position;
    
    // Intelligent Search Logic
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(searchQuery);
    const isObjectId = mongoose.Types.ObjectId.isValid(searchQuery);

    // Create an array of promises for parallel execution
    const searchPromises: Promise<SearchResult[]>[] = [];

    // 1. Search Employees/Users (Available to all roles)
    // Skip if searching for a Date (unlikely to be a name)
    if (!isDate) {
      searchPromises.push(
        (async () => {
          try {
            const query: any = {
              $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { idNumber: searchRegex },
                { email: searchRegex },
                { username: searchRegex },
                { workInfo: searchRegex },
                { location: searchRegex },
              ],
              archived: { $ne: true },
            };

            // If it's a valid ID, check _id as well
            if (isObjectId) {
               query.$or.push({ _id: searchQuery });
            }

            const employees = await UserModel.find(query)
              .select("firstName lastName idNumber email username position")
              .limit(5)
              .lean();

            return employees.map((emp: any) => ({
              type: "employee",
              id: emp._id.toString(),
              title: `${emp.firstName} ${emp.lastName}`,
              subtitle: `${emp.position} • ${emp.idNumber}`,
              link: `/employees?view=${emp._id}`,
            }));
          } catch (error) {
            console.error("Error searching employees:", error);
            return [];
          }
        })()
      );
    }

    // 2. Search Jobs (HR, Operation Manager only)
    if ((userRole === "HR" || userRole === "Operation Manager") && !isDate) {
      searchPromises.push(
        (async () => {
          try {
            const jobs = await Job.find({
              $or: [
                { title: searchRegex },
                { description: searchRegex },
                { location: searchRegex },
                { employmentType: searchRegex },
              ],
            })
              .select("title location employmentType jobStatus")
              .limit(5)
              .lean();

            return jobs.map((job: any) => ({
              type: "job",
              id: job._id.toString(),
              title: job.title,
              subtitle: `${job.location} • ${job.employmentType}`,
              link: `/hr-job-management?view=${job._id}`,
            }));
          } catch (error) {
            console.error("Error searching jobs:", error);
            return [];
          }
        })()
      );
    }

    // 3. Search Documents (HR, Operation Manager only)
    if ((userRole === "HR" || userRole === "Operation Manager") && !isDate) {
      searchPromises.push(
        (async () => {
          try {
            const documents = await DocumentModel.find({
              $or: [
                { title: searchRegex },
                { documentType: searchRegex },
                { content: searchRegex },
                { seriesYear: searchRegex },
              ],
            })
              .select("title documentType seriesYear")
              .limit(5)
              .lean();

            return documents.map((doc: any) => ({
              type: "document",
              id: doc._id.toString(),
              title: doc.title,
              subtitle: `${doc.documentType} • ${doc.seriesYear}`,
              link: `/hr-document-page?view=${doc._id}`,
            }));
          } catch (error) {
            console.error("Error searching documents:", error);
            return [];
          }
        })()
      );
    }

    // 4. Search Departments (HR, Operation Manager, Workforce)
    if (
      (userRole === "HR" ||
      userRole === "Operation Manager" ||
      userRole === "Workforce") && !isDate
    ) {
      searchPromises.push(
        (async () => {
          try {
            const departments = await Department.find({
              $or: [
                { name: searchRegex },
                { type: searchRegex },
                { description: searchRegex },
                { location: searchRegex },
              ],
              status: true,
            })
              .select("name type description location")
              .limit(5)
              .lean();

            return departments.map((dept: any) => ({
              type: "department",
              id: dept._id.toString(),
              title: dept.name,
              subtitle: `${dept.type} • ${dept.location || "N/A"}`,
              link: `/department?view=${dept._id}`,
            }));
          } catch (error) {
            console.error("Error searching departments:", error);
            return [];
          }
        })()
      );
    }

    // 5. Search Schedules (All roles)
    // Prioritize if isDate
    searchPromises.push(
      (async () => {
        try {
          const query: any = {
            $or: [
              { teamName: searchRegex },
              { workstationId: searchRegex },
            ],
          };

          if (isDate) {
             query.$or.unshift({ date: searchQuery }); // Exact match for date
          } else {
             query.$or.push({ date: searchRegex }); // Partial match otherwise
          }

          const schedules = await Schedule.find(query)
            .select("userId date teamName workstationId")
            .limit(5)
            .lean();

          return schedules.map((schedule: any) => ({
            type: "schedule",
            id: schedule._id.toString(),
            title: `Schedule - ${schedule.date}`,
            subtitle: schedule.teamName
              ? `${schedule.teamName} • ${schedule.workstationId || "N/A"}`
              : schedule.workstationId || "N/A",
            link: `/schedule?view=${schedule._id}`,
          }));
        } catch (error) {
          console.error("Error searching schedules:", error);
          return [];
        }
      })()
    );

    // 6. Search Reports (All roles)
    searchPromises.push(
      (async () => {
        try {
          const reportQuery: any = {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
              { type: searchRegex },
              { employeeName: searchRegex },
            ],
          };
          
          const progressQuery: any = {
            $or: [
              { accomplishments: searchRegex },
              { challenges: searchRegex },
              { planForNext: searchRegex },
              { employeeName: searchRegex },
            ],
          };

          const [generalReports, progressReports] = await Promise.all([
            ReportModel.find(reportQuery)
              .select("title type status priority employeeName")
              .limit(5)
              .lean(),
            ProgressReportModel.find(progressQuery)
              .select("employeeName period status")
              .limit(5)
              .lean(),
          ]);

          const generalResults = generalReports.map((report: any) => ({
            type: "report",
            id: report._id.toString(),
            title: report.title,
            subtitle: `${report.type} • ${report.status} • ${report.employeeName}`,
            link: `/report?view=${report._id}`,
          }));

          const progressResults = progressReports.map((report: any) => ({
            type: "report",
            id: report._id.toString(),
            title: `Progress Report - ${report.employeeName}`,
            subtitle: `${report.period} • ${report.status}`,
            link: `/performance?view=${report._id}`,
          }));

          return [...generalResults, ...progressResults];
        } catch (error) {
          console.error("Error searching reports:", error);
          return [];
        }
      })()
    );

    // 7. Static Module Search (Intelligent Mapping)
    searchPromises.push(
      (async () => {
        const modules = [
          // General Modules
          { name: "Dashboard", keywords: ["home", "main", "dashboard"], link: "/" },
          { name: "My Payroll", keywords: ["salary", "compensation", "payslip", "payroll"], link: "/payroll" },
          { name: "Department", keywords: ["dept", "department", "office"], link: "/department" },
          { name: "Schedule", keywords: ["calendar", "shift", "roster", "schedule"], link: "/schedule" },
          { name: "DTR / Attendance", keywords: ["time", "clock", "dtr", "attendance", "log"], link: "/dtr" },
          { name: "Leaves", keywords: ["vacation", "sick", "absence", "leave", "off"], link: "/leave" },
          { name: "Reports", keywords: ["incident", "issue", "report"], link: "/report" },
          { name: "Daily Progress", keywords: ["task", "daily", "progress", "update"], link: "/daily-progress" },
          { name: "Messaging", keywords: ["chat", "message", "communication", "inbox"], link: "/messages" },
          
          // Management Modules (RBAC filtered on frontend)
          { name: "Employee Management", keywords: ["staff", "users", "people", "employee", "management"], link: "/employees" },
          { name: "Job Management", keywords: ["job", "hiring", "vacancy", "position"], link: "/hr-job-management" },
          { name: "Applicant Management", keywords: ["applicant", "candidate", "recruitment", "hiring"], link: "/hr-applicant-management" },
          { name: "Document Management", keywords: ["file", "doc", "contract", "record"], link: "/hr-document-management" },
          { name: "Payroll Management", keywords: ["payroll", "salary", "wages", "processing"], link: "/hr-payroll-management" },
          { name: "DTR Tracking", keywords: ["dtr", "tracking", "attendance", "monitoring"], link: "/workforce-dtr-tracking" },
          { name: "Leave Management", keywords: ["leave", "approval", "requests"], link: "/workforce-leave-management" },
          { name: "Workplace Management", keywords: ["office", "building", "floor", "workplace"], link: "/workforce-workplace-management" },
          { name: "Analytics", keywords: ["stats", "data", "analysis", "analytics", "chart"], link: "/workforce-analytics-management" },
        ];

        return modules
          .filter((mod) =>
            mod.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
            mod.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((mod) => ({
            type: "module",
            id: mod.link,
            title: mod.name,
            subtitle: "System Module",
            link: mod.link,
          }));
      })()
    );

    const results = await Promise.all(searchPromises);
    const flatResults = results.flat();

    res.status(200).json({
      message: "Search results retrieved successfully",
      results: flatResults,
    });
  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({
      message: "Internal server error during search",
      results: [],
    });
  }
};
