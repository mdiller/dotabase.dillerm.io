-- Table Information
pragma table_info('{table_name query:tables}')

-- Heroes
select id, icon, image, localized_name as Name, attr_primary as Attribute from heroes

-- Items
select id, icon, localized_name as Name from items
