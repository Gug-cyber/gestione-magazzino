"""
Test per il Card Parser & Normalizer
"""
import pytest
from app.card_parser import (
    parse_card_title,
    calculate_match_score,
    ParsedCard,
    extract_number,
    extract_condition,
    extract_language,
    extract_set_name,
    extract_grading,
)


def test_parse_simple_card():
    """Test parsing carta semplice"""
    parsed = parse_card_title("Pikachu")
    assert parsed.nome == "Pikachu"
    assert parsed.numero_carta is None
    assert parsed.set_name is None


def test_parse_card_with_number():
    """Test parsing con numero carta"""
    parsed = parse_card_title("Pikachu 25/102")
    assert parsed.nome == "Pikachu"
    assert parsed.numero_carta == "25/102"


def test_parse_card_with_set():
    """Test parsing con set"""
    parsed = parse_card_title("Pikachu Base Set")
    assert parsed.nome == "Pikachu"
    assert parsed.set_name == "Base Set"


def test_parse_full_card():
    """Test parsing completo con tutti i campi"""
    parsed = parse_card_title("Pikachu Base Set 25/102 ITA NM")
    assert parsed.nome == "Pikachu"
    assert parsed.set_name == "Base Set"
    assert parsed.numero_carta == "25/102"
    assert parsed.lingua == "it"
    assert parsed.condizione == "NM"


def test_parse_graded_card():
    """Test carta gradata PSA"""
    parsed = parse_card_title("Charizard PSA 10 Base Set 4/102")
    assert parsed.nome == "Charizard"
    assert parsed.grading == "PSA 10"
    assert parsed.is_graded is True
    assert parsed.numero_carta == "4/102"


def test_parse_bgs_grading():
    """Test carta gradata BGS"""
    parsed = parse_card_title("Blastoise BGS 9.5 Base Set 2/102")
    assert parsed.grading == "BGS 9.5"
    assert parsed.is_graded is True
    assert parsed.numero_carta == "2/102"


def test_extract_number():
    """Test estrazione numero carta"""
    assert extract_number("Pikachu 25/102 NM") == "25/102"
    assert extract_number("Charizard 4/102") == "4/102"
    assert extract_number("No number here") is None


def test_extract_condition_variants():
    """Test estrazione condizione con varianti"""
    assert extract_condition("Pikachu NM") == "NM"
    assert extract_condition("Pikachu MINT") == "NM"
    assert extract_condition("Pikachu M") == "NM"
    assert extract_condition("Pikachu NEAR MINT") == "NM"
    assert extract_condition("Pikachu LP") == "LP"
    assert extract_condition("Pikachu LIGHT PLAYED") == "LP"
    assert extract_condition("Pikachu MP") == "MP"
    assert extract_condition("Pikachu PLAYED") == "MP"
    assert extract_condition("Pikachu no condition") is None


def test_extract_language():
    """Test estrazione lingua"""
    assert extract_language("Pikachu ITA NM") == "it"
    assert extract_language("Pikachu ENG NM") == "en"
    assert extract_language("Pikachu JPN NM") == "ja"
    assert extract_language("Pikachu GER NM") == "de"
    assert extract_language("Pikachu no language") is None


def test_calculate_match_score_perfect():
    """Test score matching perfetto (nome + set + numero)"""
    parsed = ParsedCard(nome="Pikachu", set_name="Base Set", numero_carta="25/102")
    blueprint = {
        "name": "Pikachu",
        "expansion_name": "Base Set",
        "number": "25",
    }
    score = calculate_match_score(parsed, blueprint)
    assert score == 100.0


def test_calculate_match_score_name_only():
    """Test score con solo nome match"""
    parsed = ParsedCard(nome="Pikachu", set_name=None, numero_carta=None)
    blueprint = {
        "name": "Pikachu",
        "expansion_name": "Base Set",
        "number": "25",
    }
    score = calculate_match_score(parsed, blueprint)
    assert score == 40.0


def test_calculate_match_score_name_and_number():
    """Test score con nome + numero match"""
    parsed = ParsedCard(nome="Pikachu", set_name=None, numero_carta="25/102")
    blueprint = {
        "name": "Pikachu",
        "expansion_name": "Base Set",
        "number": "25",
    }
    score = calculate_match_score(parsed, blueprint)
    assert score == 70.0


def test_calculate_match_score_fuzzy_name():
    """Test score con nome fuzzy match"""
    parsed = ParsedCard(nome="Pikachuu", set_name=None, numero_carta=None)
    blueprint = {
        "name": "Pikachu",
        "expansion_name": "Base Set",
        "number": "25",
    }
    score = calculate_match_score(parsed, blueprint)
    # Fuzzy match dovrebbe dare un punteggio > 0 ma < 40
    assert score > 0
    assert score < 40


def test_calculate_match_score_no_match():
    """Test score con nessuna corrispondenza"""
    parsed = ParsedCard(nome="Bulbasaur", set_name=None, numero_carta=None)
    blueprint = {
        "name": "Pikachu",
        "expansion_name": "Base Set",
        "number": "25",
    }
    score = calculate_match_score(parsed, blueprint)
    assert score == 0.0


def test_parse_card_removes_noise_words():
    """Test che le parole noise vengano rimosse"""
    parsed = parse_card_title("Pikachu holo rare promo")
    assert parsed.nome == "Pikachu"


def test_parse_preserves_short_name():
    """Test che nomi corti vengano preservati"""
    parsed = parse_card_title("MeW")
    assert len(parsed.nome) >= 1


def test_parse_card_number_leading_zeros():
    """Test gestione numeri con zeri iniziali"""
    parsed = ParsedCard(nome="Pikachu", set_name=None, numero_carta="01/102")
    blueprint = {
        "name": "Pikachu",
        "expansion_name": "Base Set",
        "number": "1",
    }
    score = calculate_match_score(parsed, blueprint)
    # I numeri con zero iniziale devono matchare (01 == 1)
    assert score >= 30


def test_parse_card_expansion_object():
    """Test che expansion come oggetto venga gestita"""
    parsed = ParsedCard(nome="Charizard", set_name="Base Set", numero_carta=None)
    blueprint = {
        "name": "Charizard",
        "expansion": {"name": "Base Set", "code": "BS"},
    }
    score = calculate_match_score(parsed, blueprint)
    assert score >= 70
