export type Reinforcement = {
  id: string;
  document_id: string;
  page_number: number;
  title: string;
  content: Record<string, unknown>;
};
