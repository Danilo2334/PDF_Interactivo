-- Cover the complete composite FK reported by the advisor. The primary key
-- remains the lookup path for one request; this also covers version references.
create index reinforcement_review_heads_current_version_idx
  on public.reinforcement_review_heads(request_id,current_version);
