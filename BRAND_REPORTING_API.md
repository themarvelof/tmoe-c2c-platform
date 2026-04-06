# Brand Reporting API Webhook Documentation

## Overview
This API allows external tools to send reporting data into the TMOE platform for brand dashboards.

## Endpoint
```
POST /api/api-webhook/brand-reports
```

## Authentication
No authentication required for this webhook endpoint.

## Request Body

```json
{
  "brand_id": "string (UUID)",
  "report_date": "string (YYYY-MM-DD)",
  "period": "string (daily|weekly|monthly)",
  "metrics": {
    "impressions": "integer",
    "clicks": "integer",
    "conversions": "integer",
    "revenue": "float",
    "ctr": "float",
    "conversion_rate": "float",
    "cost_per_click": "float",
    "roas": "float"
  },
  "campaign_breakdown": [
    {
      "campaign_id": "string",
      "campaign_name": "string",
      "metrics": { }
    }
  ],
  "custom_data": {
    "any_key": "any_value"
  }
}
```

## Example Request

```bash
curl -X POST https://your-domain.com/api/api-webhook/brand-reports \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "a2365daf-83fe-45c8-b1dc-1c217c5878c8",
    "report_date": "2026-04-06",
    "period": "daily",
    "metrics": {
      "impressions": 50000,
      "clicks": 2500,
      "conversions": 125,
      "revenue": 12500.00,
      "ctr": 5.0,
      "conversion_rate": 5.0,
      "cost_per_click": 2.50,
      "roas": 4.2
    },
    "campaign_breakdown": [],
    "custom_data": {}
  }'
```

## Response

### Success (200)
```json
{
  "message": "Report created successfully",
  "report_id": "73e53352-4c5d-442f-b73f-d5cf0660ed18"
}
```

### Error (404)
```json
{
  "detail": "Brand not found"
}
```

## Brand ID
To get a brand's ID:
1. Login as admin
2. Go to Users page
3. Find the brand user
4. Copy their user ID

## Field Descriptions

- **brand_id**: The UUID of the brand user account
- **report_date**: The date this report covers (YYYY-MM-DD format)
- **period**: Reporting period type (daily, weekly, monthly)
- **metrics.impressions**: Total ad impressions
- **metrics.clicks**: Total clicks on ads
- **metrics.conversions**: Total conversions/purchases
- **metrics.revenue**: Total revenue generated
- **metrics.ctr**: Click-through rate (percentage)
- **metrics.conversion_rate**: Conversion rate (percentage)
- **metrics.cost_per_click**: Average cost per click
- **metrics.roas**: Return on ad spend (multiplier)
- **campaign_breakdown**: Optional array of campaign-specific metrics
- **custom_data**: Optional object for any additional data

## Notes

- Reports are automatically visible in the brand's dashboard
- Multiple reports can be sent for different dates/periods
- The API will calculate aggregated summaries automatically
- Historical data is preserved and can be viewed in the dashboard
