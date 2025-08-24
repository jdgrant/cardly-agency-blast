import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface PromoCodeFormData {
  code: string;
  discount_percentage: number;
  expires_at?: string;
  max_uses?: number;
}

interface PromoCodeFormProps {
  onSubmit: (data: PromoCodeFormData) => void;
}

export const PromoCodeForm: React.FC<PromoCodeFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<PromoCodeFormData>({
    code: '',
    discount_percentage: 15,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) return;

    onSubmit({
      ...formData,
      expires_at: formData.expires_at || undefined,
      max_uses: formData.max_uses || undefined,
    });

    // Reset form
    setFormData({
      code: '',
      discount_percentage: 15,
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Promo Code *</Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SAVE15"
                required
                className="uppercase"
              />
            </div>
            
            <div>
              <Label htmlFor="discount">Discount Percentage *</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="100"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: Number(e.target.value) })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="expires">Expiry Date (Optional)</Label>
              <Input
                id="expires"
                type="date"
                value={formData.expires_at || ''}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label htmlFor="max_uses">Max Uses (Optional)</Label>
              <Input
                id="max_uses"
                type="number"
                min="1"
                value={formData.max_uses || ''}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Leave blank for unlimited"
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full">
            Create Promo Code
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};