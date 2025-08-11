-- Add occasions column to templates table
ALTER TABLE templates ADD COLUMN occasions text[] DEFAULT ARRAY['christmas', 'holidays'];

-- Update existing templates with proper occasions
UPDATE templates SET occasions = ARRAY['christmas'] WHERE id IN ('template-1', 'template-3', 'template-4', 'template-5', 'template-6', 'template-8', 'template-10', 'template-13', 'template-14', 'template-19');
UPDATE templates SET occasions = ARRAY['holidays'] WHERE id IN ('template-2', 'template-7', 'template-9', 'template-11', 'template-15', 'template-16', 'template-17', 'template-18', 'template-20');
UPDATE templates SET occasions = ARRAY['christmas', 'holidays'] WHERE id = 'template-12';