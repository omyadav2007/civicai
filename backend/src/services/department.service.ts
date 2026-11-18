import { ComplaintCategory, Department, AssignmentMethod } from '@prisma/client';

export const CATEGORY_DEPARTMENT_MAPPING: Record<ComplaintCategory, Department> = {
  [ComplaintCategory.POTHOLE]: Department.ROAD_MAINTENANCE,
  [ComplaintCategory.ROAD_DAMAGE]: Department.ROAD_MAINTENANCE,
  [ComplaintCategory.GARBAGE]: Department.SANITATION,
  [ComplaintCategory.OVERFLOWING_DUSTBIN]: Department.SANITATION,
  [ComplaintCategory.ILLEGAL_GARBAGE_DUMPING]: Department.SANITATION,
  [ComplaintCategory.UNCOLLECTED_GARBAGE]: Department.SANITATION,
  [ComplaintCategory.GARBAGE_BLOCKING_DRAIN]: Department.DRAINAGE,
  [ComplaintCategory.OPEN_GARBAGE_DUMP]: Department.SANITATION,
  [ComplaintCategory.MISSED_GARBAGE_COLLECTION]: Department.SANITATION,
  [ComplaintCategory.GENERAL_WASTE_MANAGEMENT]: Department.SANITATION,
  [ComplaintCategory.WATER_LEAKAGE]: Department.WATER_SUPPLY,
  [ComplaintCategory.DRAINAGE]: Department.DRAINAGE,
  [ComplaintCategory.STREETLIGHT]: Department.ELECTRICITY,
  [ComplaintCategory.OTHER]: Department.PUBLIC_WORKS,
};

export const DEPARTMENT_NAMES: Record<Department, string> = {
  [Department.ROAD_MAINTENANCE]: 'Road Maintenance & Infrastructure Department',
  [Department.SANITATION]: 'Solid Waste Management & Sanitation Department',
  [Department.WATER_SUPPLY]: 'Municipal Water Supply & Distribution Department',
  [Department.DRAINAGE]: 'Stormwater & Sewerage Drainage Department',
  [Department.ELECTRICITY]: 'Electrical & Street Lighting Department',
  [Department.PUBLIC_WORKS]: 'Public Works & General Municipal Maintenance Department',
};

export class DepartmentService {
  /**
   * Deterministically returns the correct municipal department for a verified category.
   * Source of truth: Prisma Department enum.
   */
  getDepartmentForCategory(category: ComplaintCategory): Department {
    return CATEGORY_DEPARTMENT_MAPPING[category] || Department.PUBLIC_WORKS;
  }

  /**
   * Server-side independent validation: Validates and maps an AI-suggested department.
   * Guarantees non-null, valid Prisma Department enum is always assigned.
   */
  validateAndResolveDepartment(
    suggestedDept: string | null | undefined,
    category: ComplaintCategory
  ): {
    department: Department;
    departmentName: string;
    isOverriddenByRule: boolean;
  } {
    const canonical = this.getDepartmentForCategory(category);
    const validDepts = Object.values(Department);

    if (suggestedDept && validDepts.includes(suggestedDept as Department)) {
      const match = suggestedDept as Department;
      // If AI recommended department aligns or is valid, accept
      return {
        department: match,
        departmentName: DEPARTMENT_NAMES[match],
        isOverriddenByRule: false,
      };
    }

    // Default to deterministic category mapping
    return {
      department: canonical,
      departmentName: DEPARTMENT_NAMES[canonical],
      isOverriddenByRule: true,
    };
  }
}

export const departmentService = new DepartmentService();
