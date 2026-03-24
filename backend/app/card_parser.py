"""
Card Name Parser & Normalizer
Estrae informazioni strutturate da titoli di carte "sporchi"
"""
import re
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class ParsedCard:
    """Dati estratti da un titolo di carta"""
    nome: str
    set_name: Optional[str] = None
    numero_carta: Optional[str] = None
    lingua: Optional[str] = None
    condizione: Optional[str] = None
    grading: Optional[str] = None
    is_graded: bool = False

    def __repr__(self):
        return f"ParsedCard(nome='{self.nome}', set='{self.set_name}', num='{self.numero_carta}')"


# Pattern comuni
CONDITION_PATTERN = r'\b(NM|LP|MP|HP|DMG|M|MINT|NEAR MINT|LIGHT PLAYED|PLAYED|POOR)\b'
GRADING_PATTERN = r'\b(PSA|BGS|CGC)\s*(\d+(?:\.\d+)?)\b'
NUMBER_PATTERN = r'\b(\d{1,3})/(\d{1,4})\b'  # Es: 25/102
LANGUAGE_CODES = {
    'ITA': 'it', 'ITALIANO': 'it', 'IT': 'it',
    'ENG': 'en', 'ENGLISH': 'en', 'EN': 'en',
    'JPN': 'ja', 'JAP': 'ja', 'JAPANESE': 'ja', 'JP': 'ja',
    'GER': 'de', 'GERMAN': 'de', 'DE': 'de',
    'FRE': 'fr', 'FRENCH': 'fr', 'FR': 'fr',
    'SPA': 'es', 'SPANISH': 'es', 'ES': 'es',
    'POR': 'pt', 'PORTUGUESE': 'pt', 'PT': 'pt',
    'KOR': 'ko', 'KOREAN': 'ko', 'KO': 'ko',
    'CHI': 'zh-hans', 'CHINESE': 'zh-hans', 'CN': 'zh-hans',
    'RUS': 'ru', 'RUSSIAN': 'ru', 'RU': 'ru',
}

# Parole da rimuovere (noise)
NOISE_WORDS = {
    'rare', 'holo', 'reverse', 'foil', 'promo', 'card', 'pokemon',
    'magic', 'mtg', 'yugioh', 'carta', 'sealed', 'pack', 'booster',
    'ultra', 'secret', 'full', 'art', 'alternate', 'extended',
    'showcase', 'borderless', 'etched', 'gilded', 'textured',
    'edition', 'ed',
}

# Abbreviazioni set comuni
SET_ALIASES = {
    'base set': 'Base Set',
    'base': 'Base Set',
    'jungle': 'Jungle',
    'fossil': 'Fossil',
    'team rocket': 'Team Rocket',
    'gym heroes': 'Gym Heroes',
    'gym challenge': 'Gym Challenge',
    'neo genesis': 'Neo Genesis',
    'neo discovery': 'Neo Discovery',
    'neo revelation': 'Neo Revelation',
    'neo destiny': 'Neo Destiny',
    'beta': 'Beta',
    'alpha': 'Alpha',
    'unlimited': 'Unlimited',
    'lob': 'Legend of Blue Eyes White Dragon',
    'mrd': 'Metal Raiders',
    'srl': 'Spell Ruler',
}


def normalize_text(text: str) -> str:
    """Normalizza testo: lowercase, rimuove caratteri speciali multipli"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s/-]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def extract_number(text: str) -> Optional[str]:
    """Estrae numero carta (es: 25/102)"""
    match = re.search(NUMBER_PATTERN, text)
    if match:
        return f"{match.group(1)}/{match.group(2)}"
    return None


def extract_condition(text: str) -> Optional[str]:
    """Estrae condizione (NM, LP, etc.)"""
    match = re.search(CONDITION_PATTERN, text, re.IGNORECASE)
    if match:
        cond = match.group(1).upper()
        if cond in ('M', 'MINT', 'NEAR MINT'):
            return 'NM'
        elif cond == 'LIGHT PLAYED':
            return 'LP'
        elif cond == 'PLAYED':
            return 'MP'
        return cond
    return None


def extract_grading(text: str) -> tuple:
    """Estrae info grading (PSA 10, BGS 9.5, etc.)"""
    match = re.search(GRADING_PATTERN, text, re.IGNORECASE)
    if match:
        company = match.group(1).upper()
        grade = match.group(2)
        return f"{company} {grade}", True
    return None, False


def extract_language(text: str) -> Optional[str]:
    """Estrae codice lingua"""
    text_upper = text.upper()
    for code, lang in LANGUAGE_CODES.items():
        if re.search(rf'\b{re.escape(code)}\b', text_upper):
            return lang
    return None


def extract_set_name(text: str) -> Optional[str]:
    """Estrae nome set (best effort)"""
    text_lower = normalize_text(text)

    # Cerca alias conosciuti (ordine importante: più lungo prima)
    for alias in sorted(SET_ALIASES.keys(), key=len, reverse=True):
        if alias in text_lower:
            return SET_ALIASES[alias]

    # Euristica: cerca pattern dopo "from/de/da/set"
    match = re.search(r'(?:from|de|da|set)\s+([a-z\s]+?)(?:\s+\d+/|\s+-|\s*$)', text_lower)
    if match:
        candidate = match.group(1).strip()
        if len(candidate) > 2:
            return candidate.title()

    return None


def remove_noise(text: str) -> str:
    """Rimuove parole di noise comuni"""
    words = text.lower().split()
    cleaned = [w for w in words if w not in NOISE_WORDS]
    return ' '.join(cleaned)


def parse_card_title(title: str) -> ParsedCard:
    """
    Parse completo di un titolo di carta.

    Estrae nome carta, set, numero, lingua, condizione e grading.

    Esempio:
        Input: "Pikachu Base Set 25/102 ITA NM"
        Output: ParsedCard(
            nome="Pikachu",
            set_name="Base Set",
            numero_carta="25/102",
            lingua="it",
            condizione="NM"
        )
    """
    original = title
    text = normalize_text(title)

    # Estrai metadati
    numero = extract_number(original)
    condizione = extract_condition(original)
    grading_info, is_graded = extract_grading(original)
    lingua = extract_language(original)
    set_name = extract_set_name(original)

    # Rimuovi numero carta
    if numero:
        text = re.sub(NUMBER_PATTERN, '', text)

    # Rimuovi condizione
    if condizione:
        text = re.sub(CONDITION_PATTERN, '', text, flags=re.IGNORECASE)

    # Rimuovi grading
    if grading_info:
        text = re.sub(GRADING_PATTERN, '', text, flags=re.IGNORECASE)

    # Rimuovi lingua
    if lingua:
        for code in LANGUAGE_CODES.keys():
            text = re.sub(rf'\b{re.escape(code)}\b', '', text, flags=re.IGNORECASE)

    # Rimuovi set name
    if set_name:
        text = text.replace(set_name.lower(), '')
        # Rimuovi anche l'alias originale che potrebbe essere rimasto
        for alias, full in SET_ALIASES.items():
            if full == set_name:
                text = text.replace(alias, '')

    # Rimuovi noise
    text = remove_noise(text)

    # Pulisci e normalizza
    nome = re.sub(r'\s+', ' ', text).strip().title()

    # Se il nome è troppo corto o vuoto, usa la prima parola del titolo originale
    if len(nome) < 2:
        nome = original.split()[0].title()

    return ParsedCard(
        nome=nome,
        set_name=set_name,
        numero_carta=numero,
        lingua=lingua,
        condizione=condizione,
        grading=grading_info,
        is_graded=is_graded,
    )


def calculate_match_score(parsed: ParsedCard, blueprint: dict) -> float:
    """
    Calcola score di matching tra carta parsed e blueprint CardTrader.

    Score:
    - Nome match esatto: +40 punti
    - Nome fuzzy (>80% similarità): +30 punti
    - Set match: +30 punti
    - Numero carta match: +30 punti

    Max: 100 punti
    """
    from difflib import SequenceMatcher

    score = 0.0

    # Nome carta
    bp_name = blueprint.get('name', '').lower()
    parsed_name = parsed.nome.lower()

    if parsed_name and bp_name:
        if parsed_name == bp_name:
            score += 40
        else:
            similarity = SequenceMatcher(None, parsed_name, bp_name).ratio()
            if similarity > 0.8:
                score += similarity * 30

    # Set/Expansion
    bp_expansion = blueprint.get('expansion_name', '').lower()
    if not bp_expansion:
        expansion_obj = blueprint.get('expansion') or {}
        bp_expansion = (expansion_obj.get('name') or '').lower()

    if parsed.set_name and bp_expansion:
        set_lower = parsed.set_name.lower()
        if set_lower in bp_expansion or bp_expansion in set_lower:
            score += 30

    # Numero carta
    bp_number = str(blueprint.get('number') or '').strip()
    if parsed.numero_carta and bp_number:
        try:
            parsed_num = str(int(parsed.numero_carta.split('/')[0]))
            bp_num = str(int(bp_number))
            if parsed_num == bp_num:
                score += 30
        except (ValueError, AttributeError):
            pass

    return min(score, 100.0)
