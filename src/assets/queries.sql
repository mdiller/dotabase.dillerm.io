--- Responses
-- {arg text text clearable:true}
-- {arg voice select query:voices value:null nullable:true searchable:true}
-- {arg criteria select query:criteria value:null nullable:true searchable:true}
-- {arg subject select query:criteria_subject value:null nullable:true searchable:true}
-- {arg order_by order options:Length=LENGTH(r.text),Critera=r.pretty_criteria enable_random:true}
SELECT v.icon as Author, r.name as Name, r.mp3 as Audio, r.text as Text, REPLACE(r.pretty_criteria,'|','<br>') as Criteria
FROM responses r JOIN voices v ON r.voice_id = v.id 
WHERE text != '' 
{if text}AND text_simple like '% {text} %' {endif}
{if voice}AND voice_id == {voice} {endif}
{if criteria}AND (r.criteria LIKE '{criteria}%' OR r.criteria LIKE '%|{criteria}%') {endif}
{if subject}AND (r.criteria LIKE '% {subject} %' OR r.criteria LIKE '% {subject}') {endif}
{order_by}
LIMIT 100

--- Loading Screens
-- {arg hero select query:heroes value:null nullable:true searchable:true}
-- {arg color color}
select image as Image, name as Name, color as Color
from loadingscreens
where true
{if hero}AND (hero_ids like '{hero}|%' or hero_ids like '%|{hero}' or hero_ids like '%|{hero}|%' or hero_ids == '{hero}') {endif}
{if color}ORDER BY ABS(hue - {color}) {endif}
limit 100

--- Heroes
select id, icon, image, localized_name as Name, attr_primary as Attribute from heroes

--- Items
-- {arg text text clearable:true}
select id, icon, localized_name as Name from items
{if text}WHERE localized_name like '%{text}%' {endif}

--- Table Information
-- {arg table_name select query:tables}
pragma table_info('{table_name}')
