export type TaskStatus = 'backlog' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  storyPoints?: number;
  createdAt: string;
  updatedAt: string;
  ownerId?: string; // Links task to Firestore owner block

  // Financial Estimates for Initiatives / Features (NPV & IRR Tooltip Demo)
  initialInvestment?: number;
  cashFlows?: number[]; // Projected cash flows for 3 periods
  discountRate?: number; // Discount rate for NPV %
}

export interface ProjectMetrics {
  totalStoryPoints: number;
  completedStoryPoints: number;
  velocity: number;
  avgSprintNPV?: number;
}
