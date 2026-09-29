import { DepartmentDoc } from "../../types/workforce/department/department.type";

export type UserLite = {
  _id?: string;
  id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  position?: string;
  profilePicture?: string;
  title?: string;
  role?: string;
  status?: string | boolean;
  archived?: boolean;
};

export const displayUserName = (u?: UserLite) => {
  if (!u) return "Unknown User";
  const name = [u.firstName, u.middleName, u.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || u.username || u.email || "Unknown User";
};

export const byId = (
  users: UserLite[] | undefined,
  id: string | null | undefined
) => (users ?? []).find((u) => (u._id ?? u.id) === id);

export const normalizeDepartments = (departments: any) => {
  const list: DepartmentDoc[] = Array.isArray(departments)
    ? departments
    : Array.isArray(departments?.departments)
      ? departments.departments
      : Array.isArray(departments?.items)
        ? departments.items
        : [];

  const safe = list.map((d) => ({
    _id: String(d._id),
    name: String(d.name),
    head: d.head ? String(d.head) : null,
    members: Array.isArray(d.members) ? d.members.map(String) : [],
  }));

  return { list, safe };
};
