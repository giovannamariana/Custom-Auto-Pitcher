# core/phonetics.py
import regex

# 1. PLOSIVAS: Procura por p, t, k, b, d, g latinos OU caracteres equivalentes em outros alfabetos
# (Inclui plosivas do Cirílico como п, т, к, б, д, г e do Hangul como ㅂ, ㄷ, ㄱ, ㅋ, ㅌ, ㅍ)
PLOSIVAS_RE = regex.compile(
    r'[ptkbdg]|[tT][sS_]|[dD][zZ_]|ch|dj|'  # Latino / Romaji
    r'[пткбдгПТКБДГцчЦЧ]|'                  # Cirílico (Russo)
    r'[ㄱㄷㅂㅅㅈㅋㅌㅍㅊㄲㄸㅃㅆㅉ]|'            # Hangul (Coreano)
    r'[かきくけこたちつてとぱぴぷぺぽばびぶべぼカキクケコタチツテトパピプペポバビブベボ]' # Kana (Japonês)
    , regex.IGNORECASE
)

# 2. SUAVES: Procura por nasais, fricativas e líquidas (m, n, s, z, f, v, r, l)
SUAVES_RE = regex.compile(
    r'[mnsBfvxzRlLjwy4X]|'                  # Latino / Romaji
    r'[мнсфвхзрлжшщМНСФВХЗРЛЖШЩ]|'          # Cirílico (Russo)
    r'[ㄴㄹㅁㅇㅎ]|'                        # Hangul (Coreano)
    r'[さしすせそまみむめもなにぬねのはひふへほざじずぜぞらりるれろわをンサシスセソマミムメモナニヌネノハヒフヘホザジズゼゾラリルレロワヲ]' # Kana (Japonês)
    , regex.IGNORECASE
)

def categorizar_fonema(lyric):
    """
    Categoriza letras/fonemas de QUALQUER idioma (incluindo Japonês, Russo,
    Coreano e Chinês) baseado nas características acústicas da consoante de ataque.
    """
    lyric_clean = lyric.strip()

    # Se for pausa do UTAU (R, r, p) ou estiver vazio
    if not lyric_clean or lyric_clean.upper() in ["R", "P", "SP", "AP"]:
        return "rest"

    # Notas de continuação do UTAU (+, -, +~)
    if lyric_clean.startswith("+") or lyric_clean == "-":
        return "cv_nao_plosivo"

    # --- REGRA ESPECIAL PARA CHINÊS (Ideogramas Hanzi) ---
    # Como ideogramas chineses representam a sílaba inteira em um único caractere,
    # se o UTAU estiver usando caracteres chineses diretos (sem ser Pinyin),
    # o ideal é tratar como o "meio-termo padrão" (vogal/padrão) para não quebrar o pitch.

    # 1. Procura por características de Plosivas (Ataque rápido)
    if PLOSIVAS_RE.search(lyric_clean):
        return "cv_plosivo"

    # 2. Procura por características de Consoantes Suaves
    if SUAVES_RE.search(lyric_clean):
        return "cv_nao_plosivo"

    # 3. Se não achou consoantes ou se for um ideograma chinês puro, assume o padrão suave de vogal
    return "vogal"
