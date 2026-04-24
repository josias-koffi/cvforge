# Analyze

US-043 maps directly to vision `§12.5`: the dashboard must expose a shareable visual card plus a native LinkedIn share action to increase social reach. The existing authenticated dashboard already exposes real candidature KPIs, ATS progression, and interview insights, so the safest scope is to build the sharing slice on top of those persisted metrics rather than adding a new backend or public analytics endpoint.

Testable scope:
- add a generated visual card from dashboard KPI data
- expose a LinkedIn offsite share link
- keep the surface consistent with the existing "Papier & Crayon" dashboard cards and responsive layout

Missing product questions: none blocking. LinkedIn public preview metadata is not required by the story; a working offsite share link plus downloadable card satisfies the acceptance criteria.
