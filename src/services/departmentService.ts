import type { Department } from '../types/lms';
import * as lmsService from '../lib/lmsService';

export const departmentService = {
  list: (orgId: string) => lmsService.getDepartments(orgId),
  create: (dept: Omit<Department, 'id' | 'createdAt'>) => lmsService.createDepartment(dept),
  update: (deptId: string, updates: Partial<Department>) => lmsService.updateDepartment(deptId, updates),
  remove: (deptId: string) => lmsService.deleteDepartment(deptId),
};
