--- tables
SELECT name as label, name as value FROM sqlite_schema WHERE type IN ('table','view') ORDER BY 1;

--- heroes
select localized_name as label, id as value, '/vpk' || icon as icon, 'width: 32px; height: 32px; margin: 4px' as icon_style from heroes

--- voices
select v.name as label, v.id as value, '/vpk' || v.icon as icon, 'width: 32px; height: 32px; margin: 4px' as icon_style, h.aliases as aliases
from voices v left join heroes h on v.hero_id = h.id

--- criteria
SELECT pretty as label, name as value FROM criteria WHERE matchkey = 'Concept' AND pretty != ''

--- criteria_subject
select c.pretty as label, group_concat(c.name, ' %'' OR r.criteria LIKE ''% ') as value, ('/vpk' || COALESCE(h.icon, '') || COALESCE(i.icon, '') ) as icon, 'width: 32px; height: 32px; margin: 4px' as icon_style
from criteria c left join heroes h on lower(c.matchvalue) = h.full_name left join items i on lower(c.matchvalue) = i.name
where c.matchkey != 'classname' and not (h.icon is null and i.icon is null) and
(c.matchvalue like 'item_%' or c.matchvalue like 'npc_dota_hero%')
group by c.pretty
order by c.pretty