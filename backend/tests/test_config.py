from app.config import parse_cors_origins


def test_wildcard_disables_credentials():
    # allow_origins=["*"] + allow_credentials=True is invalid per the CORS spec.
    origins, creds = parse_cors_origins("*")
    assert origins == ["*"]
    assert creds is False


def test_explicit_origins_enable_credentials():
    origins, creds = parse_cors_origins("https://a.example.com, https://b.example.com")
    assert origins == ["https://a.example.com", "https://b.example.com"]
    assert creds is True


def test_single_explicit_origin_enables_credentials():
    origins, creds = parse_cors_origins("https://dash.example.com")
    assert origins == ["https://dash.example.com"]
    assert creds is True


def test_whitespace_is_trimmed():
    origins, _ = parse_cors_origins("  https://a.example.com , https://b.example.com  ")
    assert origins == ["https://a.example.com", "https://b.example.com"]


def test_empty_defaults_to_wildcard():
    origins, creds = parse_cors_origins("")
    assert origins == ["*"]
    assert creds is False
