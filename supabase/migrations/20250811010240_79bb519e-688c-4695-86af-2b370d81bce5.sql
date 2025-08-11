-- First, clear existing templates
DELETE FROM templates;

-- Insert all templates from the wizard mockTemplates array
INSERT INTO templates (id, name, description, preview_url) VALUES
('template-1', 'Classic Christmas', 'Traditional red and white Christmas design', '/lovable-uploads/0e09068d-0fb0-4584-b970-36402e4bfbca.png'),
('template-2', 'Happy Holidays', 'Festive blue and red holiday pattern', '/lovable-uploads/8584b492-9272-4478-90fb-dd4c4c855270.png'),
('template-3', 'Winter Snowflakes', 'Elegant red background with snowflakes', '/lovable-uploads/f721400e-9a73-496e-b8f9-e549240a3ffa.png'),
('template-4', 'Santa Pattern', 'Fun geometric pattern with Santa faces', '/lovable-uploads/754635ac-6b1d-4205-8836-d362e9d77ffd.png'),
('template-5', 'Modern Trees', 'Contemporary Christmas tree design', '/lovable-uploads/1f9187dc-651f-4769-a1ae-bca2f0c56afe.png'),
('template-6', 'Holly Jolly', 'Split design with decorative elements', '/lovable-uploads/359ed24a-2e1b-4f5b-a30a-b18384ab769c.png'),
('template-7', 'Festive Dots', 'Clean holiday design with dotted text', '/lovable-uploads/3498a312-1399-4642-bbc1-23489b9bcc4d.png'),
('template-8', 'Winter Story', 'Blue winter scene with Christmas tree', '/lovable-uploads/573b7e1e-d99f-478e-aa39-4625e435cf44.png'),
('template-9', 'Modern Navy', 'Sophisticated navy design with abstract elements', '/lovable-uploads/1933c517-f886-496f-8d3e-52d9fc80e756.png'),
('template-10', 'Christmas Penguin', 'Cute penguin with Christmas lights', '/lovable-uploads/35a20383-2af5-4567-a9de-61e8f9e5769c.png'),
('template-11', 'Happy Holidays Snowfall', 'Festive pattern with colorful snowflakes', '/lovable-uploads/3d89fde9-f969-40b2-942f-4f8416e3accc.png'),
('template-12', 'Ho Ho Ho', 'Playful winter design with snowflake border', '/lovable-uploads/5f758811-9dad-4b62-a29c-4977b7cf1129.png'),
('template-13', 'Holiday Bear', 'Adorable bear in festive winter sweater', '/lovable-uploads/23bc8fab-f523-47fa-9ccd-631ca48edc03.png'),
('template-14', 'Santa & Reindeer', 'Classic Santa with reindeer in winter scene', '/lovable-uploads/3fc9d0d1-5cda-41e1-a1c5-edc35642161b.png'),
('template-15', 'Be Merry & Bright', 'Cheerful yellow design with festive berries', '/lovable-uploads/2461302f-36b5-4101-b3c8-7e81b104cea7.png'),
('template-16', 'Warm Wishes', 'Cozy orange design with holiday foliage', '/lovable-uploads/cd415865-0124-4471-afad-6733af6be629.png'),
('template-17', 'Holiday Lights', 'Festive string lights design', '/lovable-uploads/57f72615-5a69-4cf7-8b9e-e0ee2e3c38bd.png'),
('template-18', 'Snowman Joy', 'Cheerful snowman in winter wonderland', '/lovable-uploads/ab3b378f-82b6-41fb-ab61-0ccefe9be59e.png'),
('template-19', 'Christmas Wreath', 'Traditional wreath with red bow', '/lovable-uploads/b4db1c44-92b9-4b31-8fec-222edd74055d.png'),
('template-20', 'Elegant Gold', 'Sophisticated gold and cream design', '/lovable-uploads/ccbe10cf-f23b-4d46-97d1-880e5cccbc8a.png');