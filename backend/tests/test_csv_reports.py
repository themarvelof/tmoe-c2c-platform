"""
Test CSV Reports Feature for TMOE C2C Platform
Tests CSV upload, display of all columns, and visibility across Brand/Publisher/Admin dashboards
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://content-shop-hub.preview.emergentagent.com')

# Test credentials
SKYSCANNER_CREDS = {"email": "skyscanner@gmail.com", "password": "Skyscanner@123"}
PUBLISHER_CREDS = {"email": "abhishek@marvelof.com", "password": "Publisher@123"}
ADMIN_CREDS = {"email": "admin@tmoe.com", "password": "Admin@123"}
AMAZON_CREDS = {"email": "amazontmoe@marvelof.com", "password": "Amazon@123"}

# Expected CSV columns from Skyscanner report
EXPECTED_COLUMNS = [
    "Program", "Program Id", "Clicks", "Actions", "Sale Amount",
    "Action Earnings", "Other Earnings", "Total Earnings", "EPA", "EPC",
    "Conversion Rate", "AOV"
]


class TestAuthentication:
    """Test login for all user roles"""
    
    def test_skyscanner_brand_login(self):
        """Skyscanner brand can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SKYSCANNER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "skyscanner@gmail.com"
        assert data["user"]["role"] == "brand"
        print("PASS: Skyscanner brand login successful")
    
    def test_publisher_login(self):
        """Publisher can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PUBLISHER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "publisher"
        print("PASS: Publisher login successful")
    
    def test_admin_login(self):
        """Admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_amazon_brand_login(self):
        """Amazon TMOE brand can login (backward compatibility)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=AMAZON_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "amazontmoe@marvelof.com"
        print("PASS: Amazon TMOE brand login successful")


class TestBrandCSVReports:
    """Test CSV reports from Brand perspective"""
    
    @pytest.fixture
    def skyscanner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SKYSCANNER_CREDS)
        return response.json()["token"]
    
    def test_brand_reports_endpoint(self, skyscanner_token):
        """Brand can fetch their reports"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {skyscanner_token}"}
        )
        assert response.status_code == 200
        reports = response.json()
        assert isinstance(reports, list)
        print(f"PASS: Brand reports endpoint returns {len(reports)} reports")
    
    def test_csv_report_has_all_12_columns(self, skyscanner_token):
        """CSV report contains all 12 expected columns"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {skyscanner_token}"}
        )
        assert response.status_code == 200
        reports = response.json()
        
        # Find CSV report (has csv_columns)
        csv_reports = [r for r in reports if r.get("csv_columns") and len(r["csv_columns"]) > 0]
        assert len(csv_reports) > 0, "No CSV reports found"
        
        csv_report = csv_reports[0]
        assert csv_report["csv_columns"] == EXPECTED_COLUMNS, f"Expected {EXPECTED_COLUMNS}, got {csv_report['csv_columns']}"
        print(f"PASS: CSV report has all 12 columns: {csv_report['csv_columns']}")
    
    def test_csv_report_has_row_data(self, skyscanner_token):
        """CSV report contains row data with all column values"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {skyscanner_token}"}
        )
        reports = response.json()
        csv_reports = [r for r in reports if r.get("csv_columns") and len(r["csv_columns"]) > 0]
        
        csv_report = csv_reports[0]
        assert len(csv_report["csv_rows"]) > 0, "No rows in CSV report"
        
        row = csv_report["csv_rows"][0]
        for col in EXPECTED_COLUMNS:
            assert col in row, f"Column {col} missing from row data"
        
        # Verify specific values
        assert row["Program"] == "Skyscanner"
        assert row["Clicks"] == "26943"
        print(f"PASS: CSV row data contains all columns with correct values")
    
    def test_csv_report_filename(self, skyscanner_token):
        """CSV report has correct filename"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {skyscanner_token}"}
        )
        reports = response.json()
        csv_reports = [r for r in reports if r.get("csv_columns") and len(r["csv_columns"]) > 0]
        
        csv_report = csv_reports[0]
        assert csv_report["filename"] == "skyscanner_report.csv"
        print(f"PASS: CSV report filename is 'skyscanner_report.csv'")
    
    def test_csv_report_metrics_extracted(self, skyscanner_token):
        """CSV report has extracted summary metrics"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {skyscanner_token}"}
        )
        reports = response.json()
        csv_reports = [r for r in reports if r.get("csv_columns") and len(r["csv_columns"]) > 0]
        
        csv_report = csv_reports[0]
        metrics = csv_report["metrics"]
        
        assert metrics["clicks"] == 26943
        assert metrics["conversions"] == 858  # Actions column
        assert metrics["revenue"] > 0
        print(f"PASS: Metrics extracted - Clicks: {metrics['clicks']}, Conversions: {metrics['conversions']}, Revenue: {metrics['revenue']}")


class TestPublisherBrandReports:
    """Test that Publisher can see brand reports"""
    
    @pytest.fixture
    def publisher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PUBLISHER_CREDS)
        return response.json()["token"]
    
    def test_publisher_can_see_skyscanner_reports(self, publisher_token):
        """Publisher can see Skyscanner brand in their brand reports"""
        response = requests.get(
            f"{BASE_URL}/api/publisher/brand-reports",
            headers={"Authorization": f"Bearer {publisher_token}"}
        )
        assert response.status_code == 200
        brand_reports = response.json()
        
        # Find Skyscanner brand
        skyscanner_data = next((br for br in brand_reports if br["brand"]["email"] == "skyscanner@gmail.com"), None)
        assert skyscanner_data is not None, "Skyscanner not found in publisher brand reports"
        print(f"PASS: Publisher can see Skyscanner brand with {skyscanner_data['report_count']} reports")
    
    def test_publisher_sees_csv_columns_for_skyscanner(self, publisher_token):
        """Publisher sees all 12 CSV columns for Skyscanner reports"""
        response = requests.get(
            f"{BASE_URL}/api/publisher/brand-reports",
            headers={"Authorization": f"Bearer {publisher_token}"}
        )
        brand_reports = response.json()
        
        skyscanner_data = next((br for br in brand_reports if br["brand"]["email"] == "skyscanner@gmail.com"), None)
        csv_reports = [r for r in skyscanner_data["reports"] if r.get("csv_columns") and len(r["csv_columns"]) > 0]
        
        assert len(csv_reports) > 0, "No CSV reports for Skyscanner"
        assert csv_reports[0]["csv_columns"] == EXPECTED_COLUMNS
        print(f"PASS: Publisher sees all 12 columns for Skyscanner CSV report")


class TestAdminBrandReports:
    """Test that Admin can see all brand reports"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["token"]
    
    def test_admin_can_see_all_brands(self, admin_token):
        """Admin can see all brands in reports"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-brand-reports",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        brand_reports = response.json()
        
        brand_emails = [br["brand"]["email"] for br in brand_reports]
        assert "skyscanner@gmail.com" in brand_emails
        assert "amazontmoe@marvelof.com" in brand_emails
        print(f"PASS: Admin sees all brands: {brand_emails}")
    
    def test_admin_sees_skyscanner_csv_report(self, admin_token):
        """Admin sees Skyscanner CSV report with all 12 columns"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-brand-reports",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        brand_reports = response.json()
        
        skyscanner_data = next((br for br in brand_reports if br["brand"]["email"] == "skyscanner@gmail.com"), None)
        csv_reports = [r for r in skyscanner_data["reports"] if r.get("csv_columns") and len(r["csv_columns"]) > 0]
        
        assert len(csv_reports) > 0
        assert csv_reports[0]["csv_columns"] == EXPECTED_COLUMNS
        print(f"PASS: Admin sees Skyscanner CSV report with all 12 columns")
    
    def test_admin_upload_csv_for_brand(self, admin_token):
        """Admin can upload CSV for a brand"""
        # Get Skyscanner brand ID
        response = requests.get(
            f"{BASE_URL}/api/admin/all-brand-reports",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        brand_reports = response.json()
        skyscanner_data = next((br for br in brand_reports if br["brand"]["email"] == "skyscanner@gmail.com"), None)
        brand_id = skyscanner_data["brand"]["id"]
        
        # Upload CSV
        with open("/tmp/skyscanner_report.csv", "rb") as f:
            response = requests.post(
                f"{BASE_URL}/api/admin/brand-reports/{brand_id}/upload-csv",
                headers={"Authorization": f"Bearer {admin_token}"},
                files={"file": ("admin_upload.csv", f, "text/csv")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["row_count"] == 1
        print(f"PASS: Admin uploaded CSV for Skyscanner brand")


class TestAmazonTMOEBackwardCompatibility:
    """Test that Amazon TMOE legacy reports still work"""
    
    @pytest.fixture
    def amazon_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=AMAZON_CREDS)
        return response.json()["token"]
    
    def test_amazon_reports_endpoint(self, amazon_token):
        """Amazon TMOE can fetch their reports"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {amazon_token}"}
        )
        assert response.status_code == 200
        reports = response.json()
        print(f"PASS: Amazon TMOE reports endpoint returns {len(reports)} reports")
    
    def test_amazon_legacy_reports_have_metrics(self, amazon_token):
        """Amazon TMOE legacy reports have metrics (no csv_columns)"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {amazon_token}"}
        )
        reports = response.json()
        
        # Legacy reports don't have csv_columns
        legacy_reports = [r for r in reports if not r.get("csv_columns") or len(r.get("csv_columns", [])) == 0]
        
        if len(legacy_reports) > 0:
            legacy = legacy_reports[0]
            assert "metrics" in legacy
            assert "impressions" in legacy["metrics"]
            print(f"PASS: Amazon TMOE has {len(legacy_reports)} legacy reports with metrics")
        else:
            print(f"INFO: No legacy reports found for Amazon TMOE (may have CSV reports only)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
