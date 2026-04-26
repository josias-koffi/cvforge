Verdict: ✅ pass

Design decisions:
- `/interview` now requires selecting a candidature before a session can start.
- The selected candidature stays visible during the interview to make report ownership explicit.
- Completed sessions render a dedicated "Rapport post-entretien" card with:
  - overall score `/10`
  - per-metric scores
  - average response duration
  - keyword coverage
  - hesitation count
  - strengths and improvement points

System contract changes:
- Shared interview session start payload now accepts `applicationId`.
- Shared interview session summary now carries `applicationId` and `report`.
- Applications now expose persisted `interviewReports` for dashboard analytics consumption.
