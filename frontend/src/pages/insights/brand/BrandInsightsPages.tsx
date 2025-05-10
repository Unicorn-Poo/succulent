import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Brand, BrandInstagramInsights } from '../../../sharedDataModel';
import { InsightsChartView } from './InsightsChartView';
import { useCoState } from 'jazz-react';
import { ID } from 'jazz-tools';
import { LayoutWithNav } from '../../../Nav';
import { fetchBrandInsights } from '../../../lib/fetchBrandInsights';

export function BrandInsightsPage() {
  const brandId = useParams<{ brandId: ID<Brand> }>().brandId;
  const brand = useCoState(Brand, brandId);

  useEffect(() => {
    if (!brand) return;

    let insights;

    if (!brand._refs.instagramInsights) {
      insights = BrandInstagramInsights.create({}, { owner: brand._owner });
      brand.instagramInsights = insights;
    } else {
      insights = brand.instagramInsights;
    }

    if (!insights || !brand.metaAPIConnection?.longLivedToken) {
      return;
    }

    fetchBrandInsights(brand.metaAPIConnection?.longLivedToken, insights);
  }, [brand?.metaAPIConnection?.longLivedToken, brand?.instagramInsights]);

  return (
    <LayoutWithNav>
      {/* <Button
        onClick={() => {
          brand?.delete('instagramInsights');
        }}
      >
        Clear
      </Button> */}
      {brand?.instagramInsights ? (
        <InsightsChartView insights={brand.instagramInsights} />
      ) : (
        <div>Loading...</div>
      )}
    </LayoutWithNav>
  );
}
