import type { CardRecord } from "@/lib/validations/reinforcement-card";
import type { DocumentFragmentSelection } from "@/lib/pdf/fragment-selection";
import type { MediaRecord } from "@/lib/validations/reinforcement-media";
export type Reinforcement = {
  id: string;
  document_id: string;
  page_number: number;
  title: string;
  content: Record<string, unknown>;
  source_request_id?: string | null;
  approved_version_id?: string | null;
  source?: { id: string; project_id: string; document_id: string; page_number: number; selection: DocumentFragmentSelection | null } | null;
  card?: CardRecord | null;
  media?: MediaRecord[];
};
