"""
Test XLS/XLSX Support for TMOE C2C Platform
Tests XLS upload via Brand and Admin endpoints, CSV still works, and rejected file types
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

# Test credentials
SKYSCANNER_CREDS = {"email": "skyscanner@gmail.com", "password": "Skyscanner@123"}
ADMIN_CREDS = {"email": "admin@tmoe.com", "password": "Admin@123"}

# Test files
XLSX_FILE = "/tmp/test_report.xlsx"
CSV_FILE = "/tmp/skyscanner_report.csv"


class TestXLSUploadBrand:
    """Test XLS/XLSX upload from Brand perspective"""
    
    @pytest.fixture
    def brand_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SKYSCANNER_CREDS)
        return response.json()["token"]
    
    def test_xlsx_upload_success(self, brand_token):
        """Brand can upload XLSX file and get 200 response with columns and row_count"""
        with open(XLSX_FILE, 'rb') as f:
            files = {'file': ('test_report.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = requests.post(
                f"{BASE_URL}/api/brand/reports/upload-csv",
                headers={"Authorization": f"Bearer {brand_token}"},
                files=files
            )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "columns" in data, "Response should contain 'columns'"
        assert "row_count" in data, "Response should contain 'row_count'"
        assert "report_id" in data, "Response should contain 'report_id'"
        assert "filename" in data, "Response should contain 'filename'"
        
        # Verify data
        assert data["row_count"] == 3, f"Expected 3 rows, got {data['row_count']}"
        assert len(data["columns"]) == 6, f"Expected 6 columns, got {len(data['columns'])}"
        assert "test_report.xlsx" in data["filename"]
        
        print(f"PASS: XLSX upload successful - {data['row_count']} rows, {len(data['columns'])} columns")
        print(f"  Columns: {data['columns']}")
    
    def test_csv_upload_still_works(self, brand_token):
        """CSV upload still works after XLS support added"""
        with open(CSV_FILE, 'rb') as f:
            files = {'file': ('skyscanner_report.csv', f, 'text/csv')}
            response = requests.post(
                f"{BASE_URL}/api/brand/reports/upload-csv",
                headers={"Authorization": f"Bearer {brand_token}"},
                files=files
            )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "columns" in data
        assert "row_count" in data
        assert data["row_count"] == 5, f"Expected 5 rows, got {data['row_count']}"
        
        print(f"PASS: CSV upload still works - {data['row_count']} rows, {len(data['columns'])} columns")
    
    def test_txt_file_rejected(self, brand_token):
        """TXT file upload should be rejected with 400 error"""
        # Create a temp txt file
        txt_content = b"This is a text file\nNot a spreadsheet"
        files = {'file': ('test.txt', txt_content, 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/brand/reports/upload-csv",
            headers={"Authorization": f"Bearer {brand_token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: TXT file rejected with 400 - {data['detail']}")
    
    def test_pdf_file_rejected(self, brand_token):
        """PDF file upload should be rejected with 400 error"""
        pdf_content = b"%PDF-1.4 fake pdf content"
        files = {'file': ('report.pdf', pdf_content, 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/brand/reports/upload-csv",
            headers={"Authorization": f"Bearer {brand_token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: PDF file rejected with 400")


class TestXLSUploadAdmin:
    """Test XLS/XLSX upload from Admin perspective"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def skyscanner_brand_id(self, admin_token):
        """Get Skyscanner brand ID"""
        response = requests.get(
            f"{BASE_URL}/api/admin/brands-list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        brands = response.json()
        for brand in brands:
            if brand["user"]["email"] == "skyscanner@gmail.com":
                return brand["user"]["id"]
        pytest.skip("Skyscanner brand not found")
    
    def test_admin_xlsx_upload_for_brand(self, admin_token, skyscanner_brand_id):
        """Admin can upload XLSX file for a brand"""
        with open(XLSX_FILE, 'rb') as f:
            files = {'file': ('admin_test_report.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = requests.post(
                f"{BASE_URL}/api/admin/brand-reports/{skyscanner_brand_id}/upload-csv",
                headers={"Authorization": f"Bearer {admin_token}"},
                files=files
            )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "row_count" in data
        assert data["row_count"] == 3
        assert "brand_email" in data
        assert data["brand_email"] == "skyscanner@gmail.com"
        
        print(f"PASS: Admin XLSX upload for brand successful - {data['row_count']} rows")
    
    def test_admin_txt_file_rejected(self, admin_token, skyscanner_brand_id):
        """Admin TXT file upload should be rejected"""
        txt_content = b"Invalid file type"
        files = {'file': ('test.txt', txt_content, 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/brand-reports/{skyscanner_brand_id}/upload-csv",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Admin TXT file rejected with 400")


class TestXLSReportDisplay:
    """Test that uploaded XLS reports display correctly"""
    
    @pytest.fixture
    def brand_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SKYSCANNER_CREDS)
        return response.json()["token"]
    
    def test_xlsx_report_has_correct_columns(self, brand_token):
        """Uploaded XLSX report has correct columns stored"""
        # First upload a fresh XLSX
        with open(XLSX_FILE, 'rb') as f:
            files = {'file': ('verify_columns.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            upload_response = requests.post(
                f"{BASE_URL}/api/brand/reports/upload-csv",
                headers={"Authorization": f"Bearer {brand_token}"},
                files=files
            )
        
        assert upload_response.status_code == 200
        report_id = upload_response.json()["report_id"]
        
        # Fetch reports and find the one we just uploaded
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        
        assert response.status_code == 200
        reports = response.json()
        
        # Find our report
        our_report = None
        for r in reports:
            if r["id"] == report_id:
                our_report = r
                break
        
        assert our_report is not None, "Uploaded report not found"
        
        # Verify columns - our test file has 6 columns
        expected_cols = ['Date', 'Campaign', 'Impressions', 'Clicks', 'Conversions', 'Revenue']
        assert our_report["csv_columns"] == expected_cols, f"Expected {expected_cols}, got {our_report['csv_columns']}"
        
        # Verify rows
        assert len(our_report["csv_rows"]) == 3, f"Expected 3 rows, got {len(our_report['csv_rows'])}"
        
        # Verify first row data
        first_row = our_report["csv_rows"][0]
        assert first_row["Campaign"] == "Test Campaign"
        
        print(f"PASS: XLSX report stored correctly with {len(our_report['csv_columns'])} columns and {len(our_report['csv_rows'])} rows")
    
    def test_xlsx_report_metrics_extracted(self, brand_token):
        """XLSX report has metrics extracted from numeric columns"""
        response = requests.get(
            f"{BASE_URL}/api/brand/reports",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        
        assert response.status_code == 200
        reports = response.json()
        
        # Find an XLSX report (has csv_columns with 7 columns)
        xlsx_reports = [r for r in reports if r.get("csv_columns") and len(r["csv_columns"]) == 7]
        
        if xlsx_reports:
            report = xlsx_reports[0]
            metrics = report["metrics"]
            
            # Verify metrics are extracted
            assert metrics["clicks"] > 0, "Clicks should be extracted"
            print(f"PASS: XLSX report metrics extracted - Clicks: {metrics['clicks']}, Revenue: {metrics['revenue']}")
        else:
            print("SKIP: No XLSX reports found to verify metrics")


class TestAllowedExtensions:
    """Test file extension validation"""
    
    @pytest.fixture
    def brand_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SKYSCANNER_CREDS)
        return response.json()["token"]
    
    def test_csv_extension_allowed(self, brand_token):
        """CSV extension is allowed"""
        with open(CSV_FILE, 'rb') as f:
            files = {'file': ('test.csv', f, 'text/csv')}
            response = requests.post(
                f"{BASE_URL}/api/brand/reports/upload-csv",
                headers={"Authorization": f"Bearer {brand_token}"},
                files=files
            )
        assert response.status_code == 200
        print("PASS: .csv extension allowed")
    
    def test_xlsx_extension_allowed(self, brand_token):
        """XLSX extension is allowed"""
        with open(XLSX_FILE, 'rb') as f:
            files = {'file': ('test.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = requests.post(
                f"{BASE_URL}/api/brand/reports/upload-csv",
                headers={"Authorization": f"Bearer {brand_token}"},
                files=files
            )
        assert response.status_code == 200
        print("PASS: .xlsx extension allowed")
    
    def test_xls_extension_allowed(self, brand_token):
        """XLS extension is allowed (even if file is actually xlsx)"""
        # Note: We're testing extension validation, not actual xls parsing
        with open(XLSX_FILE, 'rb') as f:
            files = {'file': ('test.xls', f, 'application/vnd.ms-excel')}
            response = requests.post(
                f"{BASE_URL}/api/brand/reports/upload-csv",
                headers={"Authorization": f"Bearer {brand_token}"},
                files=files
            )
        # Should accept .xls extension
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: .xls extension allowed")
    
    def test_json_extension_rejected(self, brand_token):
        """JSON extension is rejected"""
        json_content = b'{"data": "test"}'
        files = {'file': ('test.json', json_content, 'application/json')}
        response = requests.post(
            f"{BASE_URL}/api/brand/reports/upload-csv",
            headers={"Authorization": f"Bearer {brand_token}"},
            files=files
        )
        assert response.status_code == 400
        print("PASS: .json extension rejected")
