/**
 * Agile and Project Management Glossary constants
 * Defines the JSON dictionary structure for terminology tooltips.
 */

export interface GlossaryTerm {
  term: string;
  chineseName: string;
  category: 'agile' | 'financial' | 'metrics';
  definition: string;
  example?: string;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  sprint: {
    term: "Sprint",
    chineseName: "衝刺週期",
    category: "agile",
    definition: "一個固定長度的週期（通常為 1 至 4 週），團隊在此期間內完成特定數量的任務並達到可交付狀態。是 Scrum 框架的核心。",
    example: "例：本次 Sprint 我們計畫承諾 5 個 Issue，預估總工作量為 13 個故事點數。"
  },
  issue: {
    term: "Issue",
    chineseName: "議題 / 任務卡",
    category: "agile",
    definition: "專案管理中追蹤工作的基本單位。可以是一個新功能（Feature）、一個錯誤（Bug）、一個改善（Task）或者一個使用者故事（User Story）。",
    example: "例：建立一個名為 '設計登入介面' 的 Issue 並指派給設計師與開發團隊。"
  },
  npv: {
    term: "NPV",
    chineseName: "淨現值 (Net Present Value)",
    category: "financial",
    definition: "將專案未來預期現金流入與流出折現至現在的價值，並減去初期的投資成本。若 NPV > 0，表示該專案在財務上是可行且具備投資價值的。",
    example: "公式：NPV = ∑ [CF_t / (1 + r)^t] - Initial Investment"
  },
  irr: {
    term: "IRR",
    chineseName: "內部報酬率 (Internal Rate of Return)",
    category: "financial",
    definition: "使投資案的淨現值 (NPV) 正好等於零時的折現率。用來評估並比較不同專案的獲利潛力，IRR 越高代表專案折算獲利能力越強。",
    example: "例：A 專案的 IRR 為 15%，高於公司設定的最基本合格收益門檻（WACC），此專案值得投資。"
  },
  roi: {
    term: "ROI",
    chineseName: "投資報酬率 (Return on Investment)",
    category: "financial",
    definition: "衡量專案效益相對於其投資成本的比例。計算方法是：(投資獲利 - 投資成本) / 投資成本，常用於快速衡量資源分配價值。",
    example: "公式：ROI = (淨利潤 / 投資成本) × 100%"
  },
  storyPoints: {
    term: "Story Points",
    chineseName: "故事點數",
    category: "metrics",
    definition: "一種用以衡量開發需求或任務之相對複雜度、工作量和潛在風險的抽象估算單位，常使用費氏數列 (1, 2, 3, 5, 8...) 表示。",
    example: "例：高風險且涉及多個 API 串接的任務通常估為 8 點，而單純文字微調則為 1 點。"
  },
  velocity: {
    term: "Velocity",
    chineseName: "團隊交付速率",
    category: "metrics",
    definition: "團隊在單個 Sprint 中平均完成並交付的故事點數總和。是用於預測團隊在未來 Sprint 中能處理多少工作量的重要指標。",
    example: "例：團隊前三個 Sprint 分別完成了 20, 24, 22 點，則平均 Velocity 為 22 點。"
  },
  backlog: {
    term: "Backlog",
    chineseName: "產品待辦清單",
    category: "agile",
    definition: "列出所有專案開發所需之功能、需求、故障修復等項目的優先順序清單。由產品負責人（PO）持續進行梳理與排序。",
    example: "例：當有新的使用者回饋提出時，將先放入 Backlog，並在 Sprint Planning 會議中排定優先順序。"
  },
  kanban: {
    term: "Kanban",
    chineseName: "看板管理",
    category: "agile",
    definition: "一種視覺化工作管理方法，藉由看板狀態列（Backlog, In Progress, Completed）呈現工作生命週期。核心在於限制在製品（WIP）以優化流程速度。",
    example: "三大原則：視覺化工作、限制在製品、管理工作流程。"
  },
  wip: {
    term: "WIP Limit",
    chineseName: "在製品限制 (Work in Progress Limit)",
    category: "metrics",
    definition: "在看板流程的特定狀態中，允許同時存在的最大任務卡數量。能有效避免多工造成的心智消耗，進而提高交付速率。",
    example: "例：如果 '進行中 (In Progress)' 欄位的 WIP 限制為 3，此時若已有 3 個任務，必須先完成其中一項才能拖入新任務。"
  }
};
