from __future__ import annotations

import json
import re
import time
import unicodedata
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
FPFS_DATA = ROOT / 'src' / 'data' / 'fpfsCategories.js'
CLUB_DATA = ROOT / 'src' / 'data' / 'clubSite.js'
OUTPUT = ROOT / 'src' / 'data' / 'athleteSeasonStats.js'
USER_AGENT = 'AD-Suzano-Athlete-Stats-Bot/1.0'


def load_exported_json(path: Path, export_name: str):
    text = path.read_text(encoding='utf-8')
    marker = f'export const {export_name} = '
    payload = text.split(marker, 1)[1].rsplit(';', 1)[0]
    return json.loads(payload)


def clean(value=''):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def normalize_name(value=''):
    text = unicodedata.normalize('NFD', clean(value).upper())
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    return re.sub(r'[^A-Z0-9]+', ' ', text).strip()


def is_suzano(value=''):
    return 'SUZANO' in normalize_name(value)


def card_count(value=''):
    text = clean(value)
    if not text:
        return 0
    times = re.findall(r'\b\d{1,2}:\d{2}\b', text)
    return len(times) if times else 1


def int_cell(value):
    match = re.search(r'\d+', clean(value))
    return int(match.group()) if match else None


def fetch_pdf(url: str):
    last_error = None
    for attempt in range(3):
        try:
            request = Request(url, headers={'User-Agent': USER_AGENT})
            with urlopen(request, timeout=45) as response:
                data = response.read()
            if not data.startswith(b'%PDF'):
                raise ValueError('resposta não é PDF')
            return data
        except Exception as error:  # pragma: no cover - proteção de rede
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'falha ao baixar {url}: {last_error}')


def parse_goal_shirts(raw_value, expected_goals):
    if expected_goals <= 0:
        return []
    first_line = str(raw_value or '').splitlines()[0]
    tokens = re.findall(r'X|\d+', first_line.upper())
    shirts = []
    cursor = 0
    for index in range(expected_goals):
        if cursor >= len(tokens):
            raise ValueError(f'anotação de gols incompleta: esperado {expected_goals}, recebido {first_line!r}')
        expected = f'{index + 1:02d}'
        token = tokens[cursor]
        if token == 'X':
            cursor += 1
            if cursor >= len(tokens):
                raise ValueError(f'camisa ausente após X: {first_line!r}')
            shirt = tokens[cursor]
            cursor += 1
        elif token == expected:
            cursor += 1
            if cursor >= len(tokens):
                raise ValueError(f'camisa ausente após {expected}: {first_line!r}')
            shirt = tokens[cursor]
            cursor += 1
        elif token.startswith(expected) and len(token) > len(expected):
            shirt = token[len(expected):]
            cursor += 1
        else:
            raise ValueError(f'ordem de gols inválida no gol {expected}: {first_line!r}')
        if not shirt.isdigit():
            raise ValueError(f'camisa inválida no gol {expected}: {first_line!r}')
        shirts.append(str(int(shirt)))
    return shirts


def find_team_section(table):
    for index, row in enumerate(table):
        first = clean(row[0] if row else '')
        if is_suzano(first):
            return index
    raise ValueError('A.D. Suzano não localizada na tabela da súmula')


def parse_suzano_sheet(category, game, pdf_bytes):
    with pdfplumber.open(BytesIO(pdf_bytes)) as document:
        tables = document.pages[0].extract_tables()
    if not tables:
        raise ValueError('tabela principal ausente')
    table = tables[0]
    header = table[2]
    home = clean(header[1])
    away = re.sub(r'\s+\d{2}/\d{2}/\d{4}$', '', clean(header[14]))
    home_goals = int_cell(header[9])
    away_goals = int_cell(header[12])
    if home_goals is None or away_goals is None:
        raise ValueError('placar final ausente')
    goals_for = home_goals if is_suzano(home) else away_goals

    section_index = find_team_section(table)
    roster_header = next(
        index for index in range(section_index + 1, len(table))
        if clean(table[index][0]) == 'Registro' and clean(table[index][1]) == 'Jogadores'
    )
    players = []
    goal_row_value = ''
    for index in range(roster_header + 1, len(table)):
        row = table[index]
        first = clean(row[0] if row else '')
        second = clean(row[1] if len(row) > 1 else '')
        if first == 'Anotação de Gols':
            for candidate in table[index + 1:]:
                if clean(candidate[0] if candidate else ''):
                    goal_row_value = candidate[0]
                    break
            break
        registration = clean(row[0] if row else '')
        shirt = clean(row[5] if len(row) > 5 else '')
        if registration.isdigit() and shirt and second and not second.startswith(('Técnico:', 'Aux.', 'Massagista:', 'Prep.', 'Méd/')):
            players.append({
                'registration': registration,
                'name': second,
                'shirt': str(int(shirt)) if shirt.isdigit() else shirt,
                'yellowCards': card_count(row[6] if len(row) > 6 else ''),
                'redCards': card_count(row[8] if len(row) > 8 else ''),
            })

    if not players:
        raise ValueError('elenco da AD Suzano vazio')
    goals_by_shirt = Counter(parse_goal_shirts(goal_row_value, goals_for))
    roster_shirts = {player['shirt'] for player in players}
    missing_shirts = set(goals_by_shirt) - roster_shirts
    if missing_shirts:
        raise ValueError(f'camisa de autor de gol fora do elenco: {sorted(missing_shirts)}')

    for player in players:
        player['goals'] = goals_by_shirt[player['shirt']]
    return {
        'category': category,
        'date': game['date'],
        'sourceUrl': game['summaryUrl'],
        'players': players,
    }


def parse_game(task):
    category, game = task
    return parse_suzano_sheet(category, game, fetch_pdf(game['summaryUrl']))


def best_official_match(name, candidates):
    target = normalize_name(name)
    if target in candidates:
        return target, 1.0
    scores = sorted(
        ((SequenceMatcher(None, target, candidate).ratio(), candidate) for candidate in candidates),
        reverse=True,
    )
    if not scores or scores[0][0] < 0.93:
        return None, 0
    if len(scores) > 1 and scores[0][0] - scores[1][0] < 0.04:
        return None, 0
    return scores[0][1], scores[0][0]


fpfs_categories = load_exported_json(FPFS_DATA, 'fpfsCategories')
club_site = load_exported_json(CLUB_DATA, 'clubSiteData')
tasks = []
for category in fpfs_categories:
    for game in category.get('playedGames', []):
        if game.get('summaryUrl'):
            tasks.append((category['category'], game))

parsed_games = []
errors = []
with ThreadPoolExecutor(max_workers=8) as executor:
    futures = {executor.submit(parse_game, task): task for task in tasks}
    for future in as_completed(futures):
        category, game = futures[future]
        try:
            parsed_games.append(future.result())
        except Exception as error:
            errors.append(f"{category} {game.get('date')} {game.get('summaryUrl')}: {error}")

if errors:
    raise RuntimeError('Falhas nas súmulas; atualização cancelada para evitar dados parciais:\n- ' + '\n- '.join(errors))

official_by_category = defaultdict(dict)
for game in parsed_games:
    category_stats = official_by_category[game['category']]
    for appearance in game['players']:
        key = normalize_name(appearance['name'])
        current = category_stats.setdefault(key, {
            'registration': appearance['registration'],
            'officialName': clean(appearance['name']).title(),
            'appearances': 0,
            'goals': 0,
            'yellowCards': 0,
            'redCards': 0,
            'shirts': Counter(),
            'sourceGames': [],
        })
        current['appearances'] += 1
        current['goals'] += appearance['goals']
        current['yellowCards'] += appearance['yellowCards']
        current['redCards'] += appearance['redCards']
        current['shirts'][appearance['shirt']] += 1
        current['sourceGames'].append(game['sourceUrl'])

category_totals = {}
for category in fpfs_categories:
    category_name = category['category']
    official_players = official_by_category.get(category_name, {})
    totals = {
        'officialAthletes': len(official_players),
        'appearances': sum(player['appearances'] for player in official_players.values()),
        'goals': sum(player['goals'] for player in official_players.values()),
        'yellowCards': sum(player['yellowCards'] for player in official_players.values()),
        'redCards': sum(player['redCards'] for player in official_players.values()),
    }
    expected_goals = category.get('record', {}).get('goalsFor')
    if expected_goals is not None and totals['goals'] != expected_goals:
        raise RuntimeError(
            f"Conciliação de gols falhou em {category_name}: "
            f"súmulas={totals['goals']}, campanha={expected_goals}"
        )
    category_totals[category_name] = totals

athletes = {}
matched = 0
for category in club_site['athletes']['categories']:
    category_name = re.sub(r'Sub-0?(\d+)', r'Sub-\1', category['label'], flags=re.I)
    candidates = official_by_category.get(category_name, {})
    for player in category['players']:
        name = clean(player.get('detail', {}).get('name') or player.get('name'))
        player_id = str(player.get('url', '')).rstrip('/').split('/')[-1]
        official_key, confidence = best_official_match(name, candidates)
        official = candidates.get(official_key) if official_key else None
        if official:
            matched += 1
            shirt_total = sum(official['shirts'].values())
            shirt_one_rate = official['shirts'].get('1', 0) / max(1, shirt_total)
            is_goalkeeper = official['appearances'] >= 2 and shirt_one_rate >= 0.75
            stats = {
                'officialName': official['officialName'],
                'matchConfidence': round(confidence, 3),
                'role': 'goalkeeper' if is_goalkeeper else 'player',
                'appearances': official['appearances'],
                'goals': official['goals'],
                'assists': None,
                'steals': None,
                'yellowCards': official['yellowCards'],
                'redCards': official['redCards'],
                'goalsConceded': None,
                'saves': None,
                'sourceGameCount': len(set(official['sourceGames'])),
                'latestSourceUrl': sorted(set(official['sourceGames']))[-1],
            }
        else:
            stats = {
                'officialName': None,
                'matchConfidence': None,
                'role': 'unconfirmed',
                'appearances': None,
                'goals': None,
                'assists': None,
                'steals': None,
                'yellowCards': None,
                'redCards': None,
                'goalsConceded': None,
                'saves': None,
                'sourceGameCount': 0,
                'latestSourceUrl': None,
            }
        athletes[player_id] = {
            'playerId': player_id,
            'name': name,
            'category': category_name,
            **stats,
        }

generated = {
    'season': 2026,
    'competition': 'Campeonato Paulista A2',
    'source': 'FPFS Súmula Online',
    'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'summary': {
        'officialGamesRead': len(parsed_games),
        'portalAthletes': len(athletes),
        'matchedAthletes': matched,
        'unmatchedAthletes': len(athletes) - matched,
    },
    'categoryTotals': category_totals,
    'athletes': athletes,
}

OUTPUT.write_text(
    '// Arquivo gerado por scripts/update-athlete-stats.py.\n'
    '// Jogos, gols e cartões: FPFS Súmula Online. Demais métricas ficam nulas até fonte confiável.\n'
    f'export const athleteSeasonStats = {json.dumps(generated, ensure_ascii=False, indent=2)};\n',
    encoding='utf-8',
)
print(
    f"Atletas atualizados: {matched}/{len(athletes)} vinculados em "
    f"{len(parsed_games)} súmulas oficiais."
)
