import React, { useEffect, useState } from 'react';
import { useWizard } from './WizardContext';
import { Tag, X } from 'lucide-react';
import { Button } from './ui/button';

export const PromoCodeBanner = () => {
  const { state } = useWizard();
  const [visible, setVisible] = useState(false);
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    if (state.promoCode) {
      setPromoCode(state.promoCode);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [state.promoCode]);

  if (!visible || !promoCode) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Tag className="w-5 h-5" />
            <div>
              <p className="font-semibold">Promo Code Active!</p>
              <p className="text-sm text-emerald-50">
                Code <span className="font-mono font-bold">{promoCode}</span> is being applied to your order
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
            className="text-white hover:bg-emerald-700 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
