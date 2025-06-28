
-- Create orders table to store campaign submissions
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  card_quantity INTEGER NOT NULL,
  regular_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  early_bird_discount BOOLEAN DEFAULT false,
  mailing_window TEXT NOT NULL,
  postage_option TEXT NOT NULL DEFAULT 'standard',
  postage_cost DECIMAL(10,2) DEFAULT 0.00,
  logo_url TEXT,
  signature_url TEXT,
  csv_file_url TEXT,
  client_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_records table to store uploaded client data
CREATE TABLE public.client_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create templates table for card designs
CREATE TABLE public.templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert sample templates
INSERT INTO public.templates (id, name, preview_url, description) VALUES
('winter-wonderland', 'Winter Wonderland', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&h=400&fit=crop', 'Beautiful winter landscape with snow-covered trees'),
('festive-gold', 'Festive Gold', 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=300&h=400&fit=crop', 'Elegant gold and red holiday design'),
('modern-minimal', 'Modern Minimal', 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=400&fit=crop', 'Clean, contemporary holiday greeting'),
('classic-red', 'Classic Red', 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=400&fit=crop', 'Traditional red and green Christmas theme'),
('snowy-pine', 'Snowy Pine', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=400&fit=crop', 'Pine trees covered in fresh snow'),
('elegant-navy', 'Elegant Navy', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=400&fit=crop', 'Sophisticated navy blue holiday card'),
('rustic-charm', 'Rustic Charm', 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=300&h=400&fit=crop', 'Warm, rustic holiday design'),
('silver-bells', 'Silver Bells', 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=300&h=400&fit=crop', 'Shimmering silver holiday theme');

-- Enable Row Level Security (make tables publicly accessible for now since no auth)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no authentication yet)
CREATE POLICY "Public can view templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can insert client records" ON public.client_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view client records" ON public.client_records FOR SELECT USING (true);

-- Create storage bucket for uploaded files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('holiday-cards', 'holiday-cards', true);

-- Create storage policies
CREATE POLICY "Public can upload files" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'holiday-cards');

CREATE POLICY "Public can view files" ON storage.objects 
FOR SELECT USING (bucket_id = 'holiday-cards');
