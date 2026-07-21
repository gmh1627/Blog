from functools import lru_cache
import sys

N = 15
DIRS = ((1, 0), (0, 1), (1, 1), (1, -1))
LINES = []
for y in range(N):
    for x in range(N):
        for dx, dy in DIRS:
            cells = [(x + i * dx, y + i * dy) for i in range(5)]
            if all(0 <= a < N and 0 <= b < N for a, b in cells):
                LINES.append(sum(1 << (b * N + a) for a, b in cells))

FULL = (1 << 225) - 1


def each(value):
    while value:
        bit = value & -value
        yield bit.bit_length() - 1
        value -= bit


def make(points):
    return sum(1 << (y * N + x) for x, y in points)


def parse(name):
    return (15 - int(name[1:])) * N + ord(name[0].upper()) - 65


def name(index):
    return chr(65 + index % N) + str(15 - index // N)


# Position after black I7 and forced white I6.
BLACK = make({(8, 5), (8, 6), (7, 7), (8, 7), (7, 8), (5, 9), (8, 8)})
WHITE = make({(8, 4), (5, 6), (7, 6), (6, 7), (5, 8), (6, 8), (8, 9)})


@lru_cache(None)
def wins(stones, opponent):
    result = 0
    for line in LINES:
        if not line & opponent and (line & stones).bit_count() == 4:
            result |= line & ~(stones | opponent)
    return result


@lru_cache(None)
def candidates(stones, opponent):
    result = 0
    for line in LINES:
        if not line & opponent and (line & stones).bit_count() >= 2:
            result |= line & ~(stones | opponent)
    return result


@lru_cache(None)
def forks(stones, opponent):
    result = []
    for move in each(candidates(stones, opponent)):
        endpoints = wins(stones | 1 << move, opponent)
        if endpoints.bit_count() > 1:
            result.append((move, endpoints))
    return tuple(result)


@lru_cache(None)
def counters(stones, opponent):
    result = 0
    for move in each(candidates(stones, opponent)):
        if wins(stones | 1 << move, opponent):
            result |= 1 << move
    return result


choice = {}
nodes = 0


@lru_cache(None)
def black_turn(black, white, depth):
    global nodes
    nodes += 1
    if depth < 1:
        return False
    if wins(black, white):
        return True
    white_wins = wins(white, black)
    if white_wins.bit_count() > 1:
        return False
    moves = white_wins or candidates(black, white)
    ordered = []
    for move in each(moves):
        next_black = black | 1 << move
        if wins(white, next_black):
            continue
        threats = wins(next_black, white)
        next_forks = () if threats else forks(next_black, white)
        if threats or next_forks:
            ordered.append((100 * threats.bit_count() + len(next_forks), move, next_black))
    ordered.sort(reverse=True)
    for _, move, next_black in ordered:
        if white_turn(next_black, white, depth - 1):
            choice[black, white, depth] = move
            return True
    return False


@lru_cache(None)
def white_turn(black, white, depth):
    global nodes
    nodes += 1
    if wins(white, black):
        return False
    black_wins = wins(black, white)
    if black_wins.bit_count() > 1:
        return depth >= 1
    if black_wins:
        return black_turn(black, white | black_wins, depth)
    next_forks = forks(black, white)
    if not next_forks:
        return False
    moves = counters(white, black)
    for move, endpoints in next_forks:
        moves |= 1 << move | endpoints
    pass_moves = FULL & ~(black | white | moves)
    if pass_moves:
        moves |= pass_moves & -pass_moves
    return all(black_turn(black, white | 1 << move, depth) for move in each(moves))


depth = int(sys.argv[1])
move = parse(sys.argv[2])
next_black = BLACK | 1 << move
forced = not wins(WHITE, next_black) and white_turn(next_black, WHITE, depth - 1)
print(f"depth={depth} forced={forced} nodes={nodes} move={name(move)}")
