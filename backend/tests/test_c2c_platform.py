"""
TMOE C2C Platform Backend Tests
Tests for authentication, brand portal, publisher content, and date grouping features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@tmoe.com"
ADMIN_PASSWORD = "Admin@123"
BRAND_EMAIL = "amazontmoe@marvelof.com"
BRAND_PASSWORD = "Amazon@123"
PUBLISHER_EMAIL = "abhishek@marvelof.com"
PUBLISHER_PASSWORD = "Publisher@123"
PUBLISHER_ID = "33c7005b-0e7c-4106-850f-9241a483a044"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        assert data["user"]["status"] == "approved"
    
    def test_brand_login_success(self):
        """Test brand login with valid credentials (amazontmoe@marvelof.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BRAND_EMAIL,
            "password": BRAND_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == BRAND_EMAIL
        assert data["user"]["role"] == "brand"
        assert data["user"]["status"] == "approved"
    
    def test_publisher_login_success(self):
        """Test publisher login with valid credentials (abhishek@marvelof.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PUBLISHER_EMAIL,
            "password": PUBLISHER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == PUBLISHER_EMAIL
        assert data["user"]["role"] == "publisher"
        assert data["user"]["status"] == "approved"
        assert data["user"]["id"] == PUBLISHER_ID
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestBrandMyPublishers:
    """Brand My Publishers endpoint tests"""
    
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
    
    def test_get_my_publishers(self, brand_token):
        """Test GET /api/brand/my-publishers returns publishers with content count"""
        response = requests.get(
            f"{BASE_URL}/api/brand/my-publishers",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least 1 publisher
        assert len(data) >= 1
        
        # Find abhishek@marvelof.com publisher
        publisher = next((p for p in data if p["user"]["email"] == PUBLISHER_EMAIL), None)
        assert publisher is not None, "Publisher abhishek@marvelof.com not found"
        
        # Verify publisher data structure
        assert "user" in publisher
        assert "content_pieces_count" in publisher
        assert "campaigns_count" in publisher
        assert "active_campaigns" in publisher
        
        # Verify content count is 9
        assert publisher["content_pieces_count"] == 9, f"Expected 9 content pieces, got {publisher['content_pieces_count']}"
        
        # Verify user ID matches
        assert publisher["user"]["id"] == PUBLISHER_ID
    
    def test_my_publishers_requires_auth(self):
        """Test that my-publishers endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brand/my-publishers")
        assert response.status_code in [401, 403]


class TestBrandPublisherContent:
    """Brand Publisher Content endpoint tests - verifies date grouping data"""
    
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
    
    def test_get_publisher_content(self, brand_token):
        """Test GET /api/brand/publishers/{publisher_id}/content returns sorted content"""
        response = requests.get(
            f"{BASE_URL}/api/brand/publishers/{PUBLISHER_ID}/content",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have 9 articles
        assert len(data) == 9, f"Expected 9 articles, got {len(data)}"
        
        # Verify content structure
        for article in data:
            assert "id" in article
            assert "title" in article
            assert "url" in article
            assert "published_date" in article
            assert "publisher_id" in article
            assert "brand_id" in article
    
    def test_content_sorted_by_date_descending(self, brand_token):
        """Test that content is sorted by published_date in descending order"""
        response = requests.get(
            f"{BASE_URL}/api/brand/publishers/{PUBLISHER_ID}/content",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify descending order
        dates = [article["published_date"] for article in data]
        assert dates == sorted(dates, reverse=True), "Content not sorted by date descending"
    
    def test_content_has_five_unique_dates(self, brand_token):
        """Test that content spans 5 different dates for date grouping"""
        response = requests.get(
            f"{BASE_URL}/api/brand/publishers/{PUBLISHER_ID}/content",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Extract unique dates (date part only)
        unique_dates = set()
        for article in data:
            date_str = article["published_date"][:10]  # Get YYYY-MM-DD
            unique_dates.add(date_str)
        
        # Should have 5 unique dates
        assert len(unique_dates) == 5, f"Expected 5 unique dates, got {len(unique_dates)}: {unique_dates}"
    
    def test_content_date_distribution(self, brand_token):
        """Test article count per date matches expected distribution"""
        response = requests.get(
            f"{BASE_URL}/api/brand/publishers/{PUBLISHER_ID}/content",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Count articles per date
        date_counts = {}
        for article in data:
            date_str = article["published_date"][:10]
            date_counts[date_str] = date_counts.get(date_str, 0) + 1
        
        # Expected distribution:
        # April 6, 2026: 2 articles
        # April 5, 2026: 3 articles
        # April 2, 2026: 2 articles
        # March 23, 2026: 1 article
        # March 19, 2026: 1 article
        expected = {
            "2026-04-06": 2,
            "2026-04-05": 3,
            "2026-04-02": 2,
            "2026-03-23": 1,
            "2026-03-19": 1
        }
        
        for date, count in expected.items():
            assert date_counts.get(date, 0) == count, f"Date {date}: expected {count}, got {date_counts.get(date, 0)}"
    
    def test_content_requires_auth(self):
        """Test that publisher content endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brand/publishers/{PUBLISHER_ID}/content")
        assert response.status_code in [401, 403]


class TestAdminDashboard:
    """Admin dashboard endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_admin_dashboard_stats(self, admin_token):
        """Test GET /api/admin/dashboard/stats returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "active_campaigns" in data
        assert "pending_verifications" in data
        assert "total_publishers" in data
        assert "total_brands" in data
        assert "total_gmv" in data
    
    def test_admin_get_all_users(self, admin_token):
        """Test GET /api/admin/users returns all users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have multiple users
        assert len(data) >= 3  # At least admin, brand, publisher


class TestPublisherDashboard:
    """Publisher dashboard endpoint tests"""
    
    @pytest.fixture
    def publisher_token(self):
        """Get publisher authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PUBLISHER_EMAIL,
            "password": PUBLISHER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Publisher authentication failed")
    
    def test_publisher_my_brands(self, publisher_token):
        """Test GET /api/publisher/my-brands returns brands"""
        response = requests.get(
            f"{BASE_URL}/api/publisher/my-brands",
            headers={"Authorization": f"Bearer {publisher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least 1 brand (Amazon TMOE)
        assert len(data) >= 1
        
        # Find Amazon TMOE brand
        brand = next((b for b in data if b["user"]["email"] == BRAND_EMAIL), None)
        assert brand is not None, "Brand amazontmoe@marvelof.com not found"
    
    def test_publisher_campaigns(self, publisher_token):
        """Test GET /api/publisher/campaigns returns campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/publisher/campaigns",
            headers={"Authorization": f"Bearer {publisher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least 1 campaign
        assert len(data) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
