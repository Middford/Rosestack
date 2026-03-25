'use client';

import { useParams } from 'next/navigation';
import { PropertyDetail } from '@/modules/portfolio/components/property-detail';
import { PORTFOLIO_PROPERTIES } from '@/modules/portfolio/data';

export default function PropertyPage() {
  const params = useParams();
  const id = params.id as string;

  const property = PORTFOLIO_PROPERTIES.find(p => p.id === id);

  if (!property) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Property Not Found</h1>
          <p className="text-sm text-text-secondary mt-1">
            No property with ID &ldquo;{id}&rdquo; exists in the portfolio.
          </p>
        </div>
        <a href="/portfolio" className="text-sm text-rose hover:text-rose-light">
          Back to Portfolio
        </a>
      </div>
    );
  }

  return <PropertyDetail property={property} />;
}
