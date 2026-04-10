"""
TMOE C2C Platform - Brand Reports Backend Tests
Tests for CSV upload, reports listing, summary, and clear all features
"""
import pytest
import requests
import os
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BRAND_EMAIL = "amazontmoe@marvelof.com"
BRAND_PASSWORD = "Amazon@123"
ADMIN_EMAIL = "admin@tmoe.com"
ADMIN_PASSWORD = "Admin@123"
PUBLISHER_EMAIL = "abhishek@marvelof.com"
PUBLISHER_PASSWORD = "Publisher@123"


class TestBrandReportsAuth:
    """Test authentication for brand reports endpoints"""
    
    def test_reports_requires_auth(self):
        """Test that reports endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brand/reports")
        assert response.status_code in [401, 403]
    
    def test_reports_summary_requires_auth(self):
        """Test that reports summary endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brand/reports/summary")
        assert response.status_code in [401, 403]
    
    def test_csv_upload_requires_auth(self):
        """Test that CSV upload endpoint requires authentication"""
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(b"date,campaign,impressions,clicks,conversions,revenue\n")
            f.write(b"2026-04-01,Test,1000,50,5,500.00\n")
            f.flush()
            with open(f.name, 'rb') as csv_file:
                response = requests.post(
                    f"{BASE_URL}/api/brand/reports/upload-csv",
                    files={"file": csv_file}
                )
        assert response.status_code in [401, 403]


class TestBrandReportsListing:
    """Test brand reports listing endpoint"""
    
    @pytest.fixture
    def brand_token(self):
        """Get brand authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BRAND_EMAIL,
            "password": BRAND_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Brand authentication failed")
    
    def test_get_reports_success(self, brand_token):
        """Test GET /api/brand/reports returns reports list"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have seeded reports (30+)
        assert len(data) >= 30
    
    def test_reports_structure(self, brand_token):
        """Test that reports have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            report = data[0]
            # Verify required fields
            assert "id" in report
            assert "brand_id" in report
            assert "report_date" in report
            assert "period" in report
            assert "metrics" in report
            
            # Verify metrics structure
            metrics = report["metrics"]
            assert "impressions" in metrics
            assert "clicks" in metrics
            assert "conversions" in metrics
            assert "revenue" in metrics
            assert "ctr" in metrics
            assert "roas" in metrics


class TestBrandReportsSummary:
    """Test brand reports summary endpoint"""
    
    @pytest.fixture
    def brand_token(self):
        """Get brand authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BRAND_EMAIL,
            "password": BRAND_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Brand authentication failed")
    
    def test_get_summary_success(self, brand_token):
        """Test GET /api/brand/reports/summary returns aggregated data"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports/summary",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "total_impressions" in data
        assert "total_clicks" in data
        assert "total_conversions" in data
        assert "total_revenue" in data
        assert "avg_ctr" in data
        assert "avg_conversion_rate" in data
        assert "avg_roas" in data
        assert "report_count" in data
    
    def test_summary_has_non_zero_values(self, brand_token):
        """Test that summary has non-zero values (seeded data exists)"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports/summary",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Seeded data should have non-zero values
        assert data["total_impressions"] > 0
        assert data["total_clicks"] > 0
        assert data["total_conversions"] > 0
        assert data["total_revenue"] > 0
        assert data["report_count"] >= 30


class TestCSVUpload:
    """Test CSV upload functionality"""
    
    @pytest.fixture
    def brand_token(self):
        """Get brand authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BRAND_EMAIL,
            "password": BRAND_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Brand authentication failed")
    
    def test_csv_upload_success(self, brand_token):
        """Test CSV upload with valid file"""
        csv_content = """date,campaign,impressions,clicks,conversions,revenue
2026-04-10,TEST_Campaign,10000,500,30,3000.00
2026-04-11,TEST_Campaign,12000,600,36,3600.00"""
        
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w') as f:
            f.write(csv_content)
            f.flush()
            with open(f.name, 'rb') as csv_file:
                response = requests.post(
                    f"{BASE_URL}/api/brand/reports/upload-csv",
                    headers={"Authorization": f"Bearer {brand_token}"},
                    files={"file": ("test_upload.csv", csv_file, "text/csv")}
                )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["reports_count"] == 2
        assert "columns_detected" in data
    
    def test_csv_upload_rejects_non_csv(self, brand_token):
        """Test that non-CSV files are rejected with 400 error"""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False, mode='w') as f:
            f.write("This is not a CSV file")
            f.flush()
            with open(f.name, 'rb') as txt_file:
                response = requests.post(
                    f"{BASE_URL}/api/brand/reports/upload-csv",
                    headers={"Authorization": f"Bearer {brand_token}"},
                    files={"file": ("test.txt", txt_file, "text/plain")}
                )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "CSV" in data["detail"]
    
    def test_csv_upload_empty_file(self, brand_token):
        """Test that empty CSV files are rejected"""
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w') as f:
            f.write("")  # Empty file
            f.flush()
            with open(f.name, 'rb') as csv_file:
                response = requests.post(
                    f"{BASE_URL}/api/brand/reports/upload-csv",
                    headers={"Authorization": f"Bearer {brand_token}"},
                    files={"file": ("empty.csv", csv_file, "text/csv")}
                )
        
        assert response.status_code == 400


class TestClearReports:
    """Test clear all reports functionality"""
    
    @pytest.fixture
    def brand_token(self):
        """Get brand authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BRAND_EMAIL,
            "password": BRAND_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Brand authentication failed")
    
    def test_delete_all_reports(self, brand_token):
        """Test DELETE /api/brand/reports clears all reports"""
        # First, upload some test data
        csv_content = """date,campaign,impressions,clicks,conversions,revenue
2026-04-20,TEST_DELETE,5000,250,15,1500.00"""
        
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w') as f:
            f.write(csv_content)
            f.flush()
            with open(f.name, 'rb') as csv_file:
                requests.post(
                    f"{BASE_URL}/api/brand/reports/upload-csv",
                    headers={"Authorization": f"Bearer {brand_token}"},
                    files={"file": ("test.csv", csv_file, "text/csv")}
                )
        
        # Get count before delete
        before_response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        before_count = len(before_response.json())
        assert before_count > 0
        
        # Delete all reports
        delete_response = requests.delete(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        assert "Deleted" in data["message"]
        
        # Verify reports are cleared
        after_response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        after_count = len(after_response.json())
        assert after_count == 0


class TestOtherPortalsStillWork:
    """Test that admin and publisher portals still work"""
    
    def test_admin_login_still_works(self):
        """Test admin login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
    
    def test_publisher_login_still_works(self):
        """Test publisher login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PUBLISHER_EMAIL,
            "password": PUBLISHER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "publisher"
    
    def test_admin_dashboard_still_works(self):
        """Test admin dashboard endpoint still works"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
    
    def test_publisher_campaigns_still_works(self):
        """Test publisher campaigns endpoint still works"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PUBLISHER_EMAIL,
            "password": PUBLISHER_PASSWORD
        })
        token = login_response.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/publisher/campaigns",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
