-- Offers collected before the entity decoder read numeric entities kept them
-- as visible text: "engagement repose sur&#xa0; trois piliers &#xa0;:".
-- SmartRecruiters and Greenhouse only; these three are all the base held.
--
-- The same clean-up `htmlToText` now does at collection: entities decoded,
-- runs of spaces collapsed, spaces around line breaks dropped, no more than
-- one blank line. An offer still published gets its description rewritten at
-- the next collection anyway; this reaches the ones that no longer are.
UPDATE "jobs"
SET "description" = btrim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        replace(replace(replace("description", '&#xa0;', ' '), '&mdash;', '—'), '&#39;', ''''),
        '[ \t]+', ' ', 'g'
      ),
      ' *\n *', E'\n', 'g'
    ),
    '\n{3,}', E'\n\n', 'g'
  ),
  E' \n'
)
WHERE "description" ~ '&#xa0;|&mdash;|&#39;';
