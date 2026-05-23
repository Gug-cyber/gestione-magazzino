import pyotp


def _enable_2fa(client, db, auth_headers, utente_admin):
    setup_resp = client.post("/api/auth/2fa/setup", headers=auth_headers)
    assert setup_resp.status_code == 200
    assert setup_resp.json()["qr_code_data_url"].startswith("data:image/png;base64,")

    db.refresh(utente_admin)
    otp_code = pyotp.TOTP(utente_admin.totp_secret).now()
    verify_resp = client.post(
        "/api/auth/2fa/verify-setup",
        json={"otp_code": otp_code},
        headers=auth_headers,
    )
    assert verify_resp.status_code == 200
    db.refresh(utente_admin)
    assert utente_admin.totp_enabled is True


def test_2fa_setup_and_verify_enable_flag(client, db, auth_headers, utente_admin):
    _enable_2fa(client, db, auth_headers, utente_admin)

    me_resp = client.get("/api/auth/me", headers=auth_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["totp_enabled"] is True


def test_login_requires_2fa_and_otp_login_returns_jwt(client, db, auth_headers, utente_admin):
    _enable_2fa(client, db, auth_headers, utente_admin)

    login_resp = client.post(
        "/api/auth/login",
        data={"username": utente_admin.username, "password": "AdminPassword123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["requires_2fa"] is True
    assert login_data["temporary_token"]

    db.refresh(utente_admin)
    otp_code = pyotp.TOTP(utente_admin.totp_secret).now()
    two_factor_resp = client.post(
        "/api/auth/2fa/login",
        json={"temporary_token": login_data["temporary_token"], "otp_code": otp_code},
    )
    assert two_factor_resp.status_code == 200
    token = two_factor_resp.json()["access_token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200


def test_disable_2fa_with_otp_restores_standard_login(client, db, auth_headers, utente_admin):
    _enable_2fa(client, db, auth_headers, utente_admin)

    db.refresh(utente_admin)
    otp_code = pyotp.TOTP(utente_admin.totp_secret).now()
    disable_resp = client.post(
        "/api/auth/2fa/disable",
        json={"otp_code": otp_code},
        headers=auth_headers,
    )
    assert disable_resp.status_code == 200

    db.refresh(utente_admin)
    assert utente_admin.totp_enabled is False
    assert utente_admin.totp_secret is None

    login_resp = client.post(
        "/api/auth/login",
        data={"username": utente_admin.username, "password": "AdminPassword123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data.get("requires_2fa") is False
    assert login_data.get("access_token")
